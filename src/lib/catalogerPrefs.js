// Tiny UX-only preference store for Phase 4 Auto-Cataloger provider selection.
// This is NOT an ASR provider. It does not call Bhashini, Google, or any external
// service. It stores UI choice only. Backend routing is decided by the cataloger
// client based on capabilities + credentials, then overruled here by user preference
// once credentials are configured.

const PREFS_KEY = 'cataloger.bhashiniPreference'
const OVERRIDE_GOOGLE = 'preferBhashini'

export function readBhashiniPreference() {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    return raw === OVERRIDE_GOOGLE
  } catch (e) {
    return false
  }
}

export function writeBhashiniPreference(preferBhashini) {
  if (typeof window === 'undefined') return
  try {
    if (preferBhashini) {
      window.localStorage.setItem(PREFS_KEY, OVERRIDE_GOOGLE)
    } else {
      window.localStorage.removeItem(PREFS_KEY)
    }
  } catch (e) {
    /* best-effort only */
  }
}