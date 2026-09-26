// Language metadata for the Multilingual Auto-Cataloger (Phase 4).
// READ-ONLY reuse of the existing 23-language list — src/i18n/languages.js is NOT modified.
// speechCode = best-effort BCP-47 tag requested from browser speech recognition.
// Availability is browser/OS dependent and checked at runtime — requested codes, not guarantees.
import { LANGUAGES } from '../i18n/languages'

const SPEECH_CODES = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', as: 'as-IN', brx: 'brx-IN', doi: 'doi-IN', gu: 'gu-IN',
  kn: 'kn-IN', ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', ml: 'ml-IN', mni: 'mni-IN', mr: 'mr-IN',
  ne: 'ne-NP', or: 'or-IN', pa: 'pa-IN', sa: 'sa-IN', sat: 'sat-Latn-IN', sd: 'sd-IN', ta: 'ta-IN',
  te: 'te-IN', ur: 'ur-IN'
}

// Every cataloger language targets English + Hindi catalog copy (see /api/cataloger/describe).
export const TRANSLATION_TARGETS = ['en', 'hi']

export const CATALOGER_LANGUAGES = LANGUAGES.map((language) => ({
  code: language.code,
  label: language.native,
  english: language.english,
  speechCode: SPEECH_CODES[language.code] || language.code,
  translationTargets: TRANSLATION_TARGETS
}))

export function getCatalogerLanguage(code) {
  return CATALOGER_LANGUAGES.find((language) => language.code === code) || null
}

// Runtime check of browser speech-recognition support for a language.
export function browserSpeechSupport(code) {
  if (typeof window === 'undefined') return { supported: false, reason: 'unsupported' }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Recognition) return { supported: false, reason: 'unsupported' }
  return { supported: true, speechCode: SPEECH_CODES[code] || code, Recognition, note: 'availability depends on the browser and OS' }
}

// Honest education text used by the provider-selection UI. These are descriptive
// labels only — they do not imply either backend is configured, live, or superior.
export const BhashiniLanguageSupport = {
  nistTitle: 'Indic speech and translation support varies by language; Bhashini / ULCA coverage is provider- and language-dependent.',
  disclaimer: 'Bhashini is an optional government-backed language platform. If enabled, audio and text may be sent to an external Indian-language service depending on the configured endpoint.'
}