// Phase 2: AI Image Studio client for POST /api/enhance (Express → FastAPI vision service).
// Uses the project's existing fetch/FormData approach; no new HTTP library.
// Returns the parsed backend payload; throws Error with the backend's message on failure.
export async function enhanceImage(file, options = {}) {
  if (!file) throw new Error('Choose or capture an image first')
  const body = new FormData()
  body.append('image', file)
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) body.append(key, String(value))
  }

  const response = await fetch('/api/enhance', { method: 'POST', body })
  let data = null
  try {
    data = await response.json()
  } catch {
    /* non-JSON body (proxy/network error page) — handled below */
  }
  if (!response.ok) {
    const message = data?.error || data?.detail || `Enhancement failed (HTTP ${response.status})`
    throw new Error(message)
  }
  if (!data?.image?.data_url) throw new Error('The enhancement service returned no image')
  return data
}

// Convert a base64 data URL into a File so the result can flow into the existing
// draftStore contract (draft.imageFile is consumed by the scanner flow).
export async function dataUrlToFile(dataUrl, filename = 'enhanced-product.jpg') {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const mime = blob.type || 'image/jpeg'
  const extension = mime.includes('png') ? 'png' : 'jpg'
  return new File([blob], filename.replace(/\.[^.]*$/, '') + '.' + extension, { type: mime })
}
