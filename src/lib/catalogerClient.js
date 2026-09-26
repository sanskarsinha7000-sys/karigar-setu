// Client for the Multilingual Auto-Cataloger backend (Phase 4).
// Uses the project's existing fetch approach — no HTTP library is added.

async function toError(response, fallback) {
  let data = null
  try { data = await response.json() } catch (parseError) { /* non-JSON body */ }
  let message = fallback
  if (data && (data.error || data.detail)) message = data.error || data.detail
  const error = new Error(message)
  error.status = response.status
  error.data = data
  return error
}

export async function fetchCatalogerCapabilities() {
  const response = await fetch('/api/cataloger/capabilities')
  if (!response.ok) throw await toError(response, 'Could not load speech provider capabilities.')
  return response.json()
}

export async function transcribeAudio(blob, language, filename = 'recording.webm') {
  const body = new FormData()
  body.append('audio', blob, filename)
  body.append('language', language)
  const response = await fetch('/api/cataloger/transcribe', { method: 'POST', body })
  if (!response.ok) throw await toError(response, 'Transcription failed.')
  return response.json()
}

export async function generateCatalogCopy(payload) {
  const response = await fetch('/api/cataloger/describe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!response.ok) throw await toError(response, 'Catalog generation failed.')
  return response.json()
}