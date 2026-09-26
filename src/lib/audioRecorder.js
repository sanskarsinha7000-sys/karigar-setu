// Browser audio recording for the Multilingual Auto-Cataloger (Phase 4).
// Recordings stay in memory (Blob) until submitted; nothing is persisted by this application.

export function isRecordingSupported() {
  return typeof window !== 'undefined' && typeof window.MediaRecorder === 'function' &&
    Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

export function createAudioRecorder({ onTick, onStateChange } = {}) {
  let mediaStream = null
  let recorder = null
  let chunks = []
  let timerId = null
  let startedAt = 0
  let state = 'idle'
  // Retains the most recent non-empty recording so callers can still send it after stop().
  let lastRecording = null

  const setState = (next) => { state = next; if (onStateChange) onStateChange(next) }

  const pickMime = () => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    if (typeof window.MediaRecorder !== 'function') return ''
    return candidates.find((type) => typeof window.MediaRecorder.isTypeSupported === 'function' && window.MediaRecorder.isTypeSupported(type)) || ''
  }

  const stopTracks = () => {
    if (mediaStream) { mediaStream.getTracks().forEach((track) => track.stop()); mediaStream = null }
    if (timerId) { clearInterval(timerId); timerId = null }
  }

  async function start() {
    if (!isRecordingSupported()) { const error = new Error('unsupported'); error.code = 'unsupported'; throw error }
    if (state === 'recording') return
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
      const error = new Error(denied ? 'denied' : 'unavailable')
      error.code = denied ? 'denied' : 'unavailable'
      throw error
    }
    chunks = []
    lastRecording = null
    const mime = pickMime()
    recorder = mime ? new window.MediaRecorder(mediaStream, { mimeType: mime }) : new window.MediaRecorder(mediaStream)
    recorder.ondataavailable = (event) => { if (event.data && event.data.size) chunks.push(event.data) }
    recorder.start()
    startedAt = Date.now()
    if (onTick) onTick(0)
    timerId = setInterval(() => { if (onTick) onTick(Math.floor((Date.now() - startedAt) / 1000)) }, 500)
    setState('recording')
  }

  function stop() {
    return new Promise((resolve, reject) => {
      if (!recorder || state !== 'recording') { stopTracks(); setState('idle'); resolve(null); return }
      recorder.onstop = () => {
        const type = (recorder && recorder.mimeType) || 'audio/webm'
        const blob = chunks.length ? new Blob(chunks, { type }) : null
        lastRecording = blob && blob.size ? { blob, mimeType: type } : null
        chunks = []; recorder = null; stopTracks(); setState('idle')
        resolve(lastRecording)
      }
      recorder.onerror = (event) => { chunks = []; recorder = null; stopTracks(); setState('idle'); reject(event.error || new Error('recorder-error')) }
      try { recorder.stop() } catch (error) { stopTracks(); reject(error) }
    })
  }

  function reset() {
    try { if (recorder && state === 'recording') recorder.stop() } catch (error) { /* already stopped */ }
    chunks = []; lastRecording = null; recorder = null; stopTracks(); setState('idle')
  }

  return {
    start,
    stop,
    reset,
    // Blob of the most recent recording; null when nothing usable was captured.
    getBlob: () => (lastRecording && lastRecording.blob) || null,
    getState: () => state,
    isSupported: isRecordingSupported()
  }
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0)
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
// __P4_WAV__
export function exportWav(blobOrArrayBuffer) {
  if (typeof blobOrArrayBuffer === 'string') throw new Error('audio input must be a Blob or ArrayBuffer')
  return new Promise((resolve, reject) => {
    let source = null
    let resolved = false
    const dispose = () => { if (source) { try { source.close() } catch (e) { /* ignore */ } source = null } }
    const onError = (err) => { dispose(); if (!resolved) { resolved = true; reject(err instanceof Error ? err : new Error(String(err))) } }
    const onSuccess = (wavBlob) => { dispose(); if (!resolved) { resolved = true; resolve(wavBlob) } }

    if (blobOrArrayBuffer instanceof Blob) {
      if (!blobOrArrayBuffer.arrayBuffer) { reject(new Error('environment does not support Blob.arrayBuffer')); return }
      source = { close: () => {} }
      blobOrArrayBuffer.arrayBuffer().then((buffer) => {
        buildWav(buffer).then(onSuccess).catch(onError)
      }).catch(onError)
      return
    }

    if (blobOrArrayBuffer instanceof ArrayBuffer) {
      buildWav(blobOrArrayBuffer).then(onSuccess).catch(onError)
      return
    }

    reject(new Error('unsupported audio input type'))
  })
}

// decodeAudioData returns a Promise in every modern browser, so always await it and
// fall back to the legacy callback API for older Safari builds. The context is closed
// right after decoding so repeated exports do not leak AudioContexts.
async function decodeAudio(inputBuffer) {
  const audioCtx = getContext()
  try {
    return await new Promise((resolve, reject) => {
      const maybePromise = audioCtx.decodeAudioData(inputBuffer.slice(0), resolve, reject)
      if (maybePromise && typeof maybePromise.then === 'function') maybePromise.then(resolve, reject)
    })
  } catch (error) {
    return null
  } finally {
    try { audioCtx.close() } catch (e) { /* ignore */ }
  }
}

async function buildWav(inputBuffer) {
  const audioBuffer = await decodeAudio(inputBuffer)
  if (audioBuffer) return wavFromBuffer(audioBuffer)
  return wavFromBuffer(inputBuffer)
}

// Accepts either a decoded AudioBuffer or a raw ArrayBuffer of PCM/WAV bytes.
function wavFromBuffer(input) {
  let floatData = null
  let numChannels = 1
  let sampleRate = 44100

  if (input.numberOfChannels) {
    floatData = input.getChannelData(0)
    numChannels = input.numberOfChannels
    sampleRate = input.sampleRate
  } else {
    const array = new Uint8Array(input)
    const littleEndian = true
    const offset = 0
    if (array.length < 44) throw new Error('audio is too short to convert to WAV')
    // Only real RIFF/WAVE bytes may be reinterpreted as PCM. Anything else (for example a
    // WebM recording this browser could not decode) must fail loudly instead of producing
    // a WAV of invented samples that would be sent to the transcription provider.
    if (String.fromCharCode(array[0], array[1], array[2], array[3]) !== 'RIFF') {
      throw new Error('recording could not be decoded to WAV in this browser')
    }
    const channels = array[22] | (array[23] << 8)
    const sr = array[24] | (array[25] << 8) | (array[26] << 16) | (array[27] << 24)
    if (!sr) throw new Error('could not read sample rate from audio')
    sampleRate = sr
    numChannels = channels >= 1 && channels <= 2 ? channels : 1
    const bitsPerSample = array[34] | (array[35] << 8)
    const bytesPerSample = bitsPerSample >= 8 && bitsPerSample <= 32 ? bitsPerSample / 8 : 2
    const dataLength = array.length - 44
    const samples = Math.floor(dataLength / (bytesPerSample * numChannels))
    floatData = new Float32Array(samples)
    const data = input.slice(offset + 44, offset + 44 + dataLength)
    const view = new DataView(data)
    for (let i = 0; i < samples; i++) {
      let sample = 0
      if (bytesPerSample === 1) {
        sample = view.getUint8(i * bytesPerSample) / 128 - 1
      } else if (bytesPerSample === 2) {
        sample = view.getInt16(i * bytesPerSample, littleEndian) / 32768
      } else if (bytesPerSample === 4) {
        sample = view.getFloat32(i * bytesPerSample, littleEndian)
      }
      floatData[i] = Math.max(-1, Math.min(1, sample))
    }
  }

  const interleaved = new Float32Array(floatData.length * numChannels)
  for (let i = 0; i < floatData.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      interleaved[i * numChannels + c] = floatData[i]
    }
  }

  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const dataLength = interleaved.length * bytesPerSample
  const out = new ArrayBuffer(44 + dataLength)
  const view = new DataView(out)
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeStr(36, 'data')
  view.setUint32(40, dataLength, true)
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
  return new Blob([out], { type: 'audio/wav' })
}

function getContext() {
  const Ctx = typeof window !== 'undefined' && window.AudioContext
  if (!Ctx) throw new Error('Web Audio API is not available in this browser')
  return new Ctx()
}