// Phase 4: OPTIONAL Google Cloud REST provider (Speech-to-Text v1 + Translation v2).
//
// STATUS: implemented but NOT live-verified here - no Google credentials exist in this
// environment. The app runs without it; the capability endpoint reports it unavailable.
//
// Keys are read ONLY from the environment (never hard-coded, never committed, never sent to
// the browser - every request is made by this Express server):
//   GOOGLE_SPEECH_API_KEY     Speech-to-Text v1 API key   (or GOOGLE_ACCESS_TOKEN)
//   GOOGLE_TRANSLATE_API_KEY  Translation v2 API key
//   GOOGLE_SPEECH_URL / GOOGLE_TRANSLATE_URL  optional endpoint overrides
const NAME = 'google-cloud-rest'
const KIND = 'real-provider'

const DEFAULT_SPEECH_URL = 'https://speech.googleapis.com/v1/speech:recognize'
const DEFAULT_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2'

// Browser recordings are usually WebM/Opus, which Speech-to-Text v1 accepts directly
// (WEBM_OPUS/OGG_OPUS). No local conversion and no ffmpeg are required.
const ENCODING_BY_MIME = {
  'audio/webm': { encoding: 'WEBM_OPUS', sampleRateHertz: 48000 },
  'audio/ogg': { encoding: 'OGG_OPUS', sampleRateHertz: 48000 },
  'audio/wav': { encoding: 'LINEAR16', sampleRateHertz: 16000 },
  'audio/x-wav': { encoding: 'LINEAR16', sampleRateHertz: 16000 },
  'audio/mpeg': { encoding: 'MP3' },
  'audio/mp3': { encoding: 'MP3' },
  'audio/flac': { encoding: 'FLAC' },
  'audio/amr': { encoding: 'AMR' }
}

function getConfig() {
  const speechApiKey = process.env.GOOGLE_SPEECH_API_KEY || ''
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN || ''
  const translateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || ''
  return {
    speechApiKey,
    accessToken,
    translateApiKey,
    speechUrl: process.env.GOOGLE_SPEECH_URL || DEFAULT_SPEECH_URL,
    translateUrl: process.env.GOOGLE_TRANSLATE_URL || DEFAULT_TRANSLATE_URL,
    asrConfigured: Boolean(speechApiKey || accessToken),
    translationConfigured: Boolean(translateApiKey),
    missing: [
      ...(speechApiKey || accessToken ? [] : ['GOOGLE_SPEECH_API_KEY (or GOOGLE_ACCESS_TOKEN)']),
      ...(translateApiKey ? [] : ['GOOGLE_TRANSLATE_API_KEY'])
    ]
  }
}

function getCapability() {
  const config = getConfig()
  const parts = [config.asrConfigured ? 'speech-to-text' : null, config.translationConfigured ? 'translation' : null].filter(Boolean)
  return {
    provider: NAME,
    kind: KIND,
    stage: 'backend',
    configured: parts.length > 0,
    available: parts.length > 0,
    serverSide: true,
    supports: { asr: config.asrConfigured, translation: config.translationConfigured },
    languages: [],
    languageNote: 'Google Speech-to-Text takes BCP-47 tags; not every regional language is covered by every model.',
    reason: parts.length ? `Configured for: ${parts.join(' + ')}.` : `Not configured. Missing: ${config.missing.join(', ')}.`,
    notes: [
      'Audio sent to this provider leaves this application and is processed by Google Cloud.',
      'This provider has not been exercised in this environment.'
    ]
  }
}

async function transcribe({ buffer, mimetype, language }) {
  const config = getConfig()
  if (!config.asrConfigured) {
    const error = new Error(`Google Speech-to-Text is not configured (${config.missing.join(', ')})`)
    error.code = 'PROVIDER_UNAVAILABLE'
    throw error
  }
  const format = ENCODING_BY_MIME[String(mimetype || '').split(';')[0].trim()] || {}
  const url = config.speechApiKey ? `${config.speechUrl}?key=${encodeURIComponent(config.speechApiKey)}` : config.speechUrl
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(config.accessToken ? { Authorization: `Bearer ${config.accessToken}` } : {}) },
    body: JSON.stringify({
      config: { ...format, encoding: format.encoding || 'ENCODING_UNSPECIFIED', languageCode: language, enableAutomaticPunctuation: true },
      audio: { content: Buffer.from(buffer).toString('base64') }
    })
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Google Speech-to-Text failed (HTTP ${response.status}): ${text.slice(0, 200)}`)
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Google Speech-to-Text returned a non-JSON response')
  }
  const transcript = data?.results?.map((entry) => entry?.alternatives?.[0]?.transcript || '').join(' ').trim() || ''
  if (!transcript) throw new Error('Google Speech-to-Text returned no transcript')
  return { provider: NAME, capability: 'speech-to-text', kind: KIND, language, text: transcript, isFallback: false, audioMimeType: mimetype || null, encoding: format.encoding || 'ENCODING_UNSPECIFIED' }
}

async function translate({ text, source, target }) {
  const config = getConfig()
  if (!config.translationConfigured) {
    const error = new Error('Google Translation is not configured (GOOGLE_TRANSLATE_API_KEY)')
    error.code = 'PROVIDER_UNAVAILABLE'
    throw error
  }
  const response = await fetch(`${config.translateUrl}?key=${encodeURIComponent(config.translateApiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: [text], source, target, format: 'text' })
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`Google Translation failed (HTTP ${response.status}): ${body.slice(0, 200)}`)
  let data = null
  try {
    data = JSON.parse(body)
  } catch {
    throw new Error('Google Translation returned a non-JSON response')
  }
  const translated = String(data?.data?.translations?.[0]?.translatedText || '').trim()
  if (!translated) throw new Error('Google Translation returned no text')
  return { provider: NAME, capability: 'translation', kind: KIND, language: target, text: translated.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'), isFallback: false }
}

module.exports = { NAME, KIND, ENCODING_BY_MIME, getCapability, getConfig, transcribe, translate }
