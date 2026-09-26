// Phase 4: browser Web Speech API fallback descriptor.
//
// IMPORTANT HONESTY RULES BAKED INTO THIS MODULE:
//   * Recognition happens IN THE BROWSER, not on this server. This module never transcribes.
//   * It is NOT "offline" and NOT on-device by definition: browser engines commonly send audio
//     to a browser-managed remote service, and some use on-device models. We claim neither.
//   * Language coverage differs per browser and per language, so coverage is listed explicitly
//     instead of assuming all 23 project languages work.
//   * If something is not supported, the UI says so - no transcript is ever fabricated.
const NAME = 'browser-speech-recognition'
const KIND = 'browser-fallback'

// BCP-47 tags that Chromium-based browsers commonly accept for the Web Speech API.
// Everything absent from this map has NO known browser speech-recognition path.
const BROWSER_SPEECH_CODES = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ur: 'ur-IN'
}

function supportsLanguage(language) {
  return Boolean(BROWSER_SPEECH_CODES[language])
}

function getCapability() {
  return {
    provider: NAME,
    kind: KIND,
    stage: 'browser',
    configured: true,
    available: true,
    serverSide: false,
    supports: { asr: true, translation: false },
    languages: Object.keys(BROWSER_SPEECH_CODES),
    browserSpeechCodes: BROWSER_SPEECH_CODES,
    languageNote: 'Coverage depends on the browser and the voice data it has; only the languages listed here have a known browser path.',
    reason: 'Used automatically when no backend speech provider is configured.',
    notes: [
      'Runs through the Web Speech API inside the browser; this server does not transcribe the audio.',
      'Not offline: browsers may process speech through browser-managed remote services.',
      'Accuracy and punctuation depend entirely on the browser implementation.',
      'Language coverage is per-browser; unsupported languages cannot be transcribed this way.'
    ]
  }
}

// The server cannot transcribe through the browser, so this fails loudly rather than guessing.
async function transcribe() {
  const error = new Error('Browser speech recognition runs in the browser, not on this server')
  error.code = 'BROWSER_ONLY'
  error.provider = NAME
  throw error
}

// Translation is either done by a real provider or by the deterministic describe generator.
async function translate() {
  const error = new Error('The browser fallback does not translate; use a configured provider or deterministic generation')
  error.code = 'UNSUPPORTED'
  error.provider = NAME
  throw error
}

module.exports = { NAME, KIND, BROWSER_SPEECH_CODES, getCapability, supportsLanguage, transcribe, translate }
