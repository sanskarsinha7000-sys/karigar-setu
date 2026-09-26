// Tiny i18n runtime for KARIGAR SETU (Stage 1: core artisan flow).
// - zustand store matches the existing state-management pattern (no new dependencies).
// - persists selection in localStorage key `karigarSetuLanguage`; invalid values fall back to English.
// - applies document lang + dir dynamically (RTL for Urdu and Sindhi).
import create from 'zustand'
import { LANGUAGES, DEFAULT_LANGUAGE } from './languages'
import { translations } from './translations'
import { AI_VALUE_MAP } from './aiValues'

export const STORAGE_KEY = 'karigarSetuLanguage'
const LANGUAGE_CODES = LANGUAGES.map((language) => language.code)
const LANGUAGE_BY_CODE = Object.fromEntries(LANGUAGES.map((language) => [language.code, language]))

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return LANGUAGE_CODES.includes(stored) ? stored : DEFAULT_LANGUAGE
  } catch (error) {
    return DEFAULT_LANGUAGE
  }
}

function applyDocumentLanguage(code) {
  const language = LANGUAGE_BY_CODE[code] || LANGUAGE_BY_CODE[DEFAULT_LANGUAGE]
  document.documentElement.lang = code
  document.documentElement.dir = language.dir
}

export const useLanguageStore = create((set) => ({
  language: DEFAULT_LANGUAGE,
  dir: LANGUAGE_BY_CODE[DEFAULT_LANGUAGE].dir,
  setLanguage: (code) => {
    if (!LANGUAGE_CODES.includes(code)) return
    try {
      window.localStorage.setItem(STORAGE_KEY, code)
    } catch (error) {
      /* storage unavailable; selection still applies for this session */
    }
    applyDocumentLanguage(code)
    set({ language: code, dir: LANGUAGE_BY_CODE[code].dir })
  },
  init: () => {
    const code = readStoredLanguage()
    applyDocumentLanguage(code)
    set({ language: code, dir: LANGUAGE_BY_CODE[code].dir })
  }
}))

// Call once at app startup (main.jsx) so the persisted language is applied before first render.
export function initLanguage() {
  useLanguageStore.getState().init()
}

function lookup(dictionary, key) {
  return key.split('.').reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), dictionary)
}

// Dot-path translation with English fallback; `{name}` placeholders are replaced from `vars`.
export function translate(language, key, vars) {
  let value = lookup(translations[language], key)
  if (value === undefined) value = lookup(translations[DEFAULT_LANGUAGE], key)
  if (typeof value !== 'string') return key
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.split(`{${name}}`).join(String(replacement))
    }
  }
  return value
}

// Display-only mapping for the stable English values returned by the vision service.
// Unknown values always fall back to the original value, never undefined/null.
export function translateAiValue(type, value, language) {
  if (!value) return value
  const entry = AI_VALUE_MAP[type] && AI_VALUE_MAP[type][value]
  if (!entry) return value
  return entry[language] || entry[DEFAULT_LANGUAGE] || value
}

export function useTranslation() {
  const language = useLanguageStore((state) => state.language)
  const dir = useLanguageStore((state) => state.dir)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const t = (key, vars) => translate(language, key, vars)
  const aiValue = (type, value) => translateAiValue(type, value, language)
  return { t, aiValue, language, dir, setLanguage, languages: LANGUAGES }
}