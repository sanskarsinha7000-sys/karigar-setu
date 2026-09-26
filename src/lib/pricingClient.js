// Phase 3: Dynamic Pricing client for POST /api/pricing/suggest (Express backend).
// Uses the project's existing fetch approach; no new HTTP library is added.
// Returns the parsed backend payload and throws an Error carrying the backend's message.
const SUGGEST_ENDPOINT = '/api/pricing/suggest'

export async function suggestPrice(input) {
  const response = await fetch(SUGGEST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    /* non-JSON body (proxy or network error page) - handled below */
  }

  if (!response.ok) {
    throw new Error(data?.error || `Price suggestion failed (HTTP ${response.status})`)
  }
  if (typeof data?.suggestedPrice !== 'number') {
    throw new Error('The pricing service returned no suggested price')
  }
  return data
}
