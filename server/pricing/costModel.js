// Phase 3: Dynamic Pricing - transparent, deterministic cost model.
//
// THIS IS NOT MACHINE LEARNING. There are no trained weights, no learned parameters and
// no statistical forecasting anywhere in this file. It is arithmetic plus a documented
// blend against the median of matching reference listings.
//
// FORMULA (money in INR, rounded to whole rupees)
//   laborCost     = laborHours x laborRate
//   baseCost      = rawMaterialCost + laborCost + packagingCost + transportCost
//   costPlusPrice = baseCost x (1 + targetMarginPercent / 100)
//
//   With comparable listings (sampleSize > 0):
//     anchor    = median price of ALL qualifying comparable listings
//     blended   = COST_WEIGHT x costPlusPrice + MARKET_WEIGHT x anchor     // 0.60 / 0.40
//     floor     = max(baseCost, FLOOR_FACTOR x costPlusPrice)              // never below cost
//     ceiling   = CEILING_FACTOR x costPlusPrice                           // avoid extremes
//     suggested = clamp(blended, floor, ceiling)
//
//   Without comparable listings (sampleSize === 0):
//     suggested = costPlusPrice   (pure cost-plus; the response states
//                                 anchoringAvailable: false and explains why)
//
//   minPrice = max(baseCost, 0.85 x suggested)
//   maxPrice = max(costPlusPrice, 1.25 x suggested)
//
//   Invariant: baseCost <= minPrice <= suggestedPrice <= maxPrice
//
// The weights are named constants so this engine can later be replaced by a real ML model
// behind the same response shape without changing the API contract.
const { getReferenceSummary } = require('./referenceData')

const COST_WEIGHT = 0.6
const MARKET_WEIGHT = 0.4
const FLOOR_FACTOR = 0.75
const CEILING_FACTOR = 1.5
const RANGE_LOW_FACTOR = 0.85
const RANGE_HIGH_FACTOR = 1.25
const SMALL_SAMPLE_THRESHOLD = 3

// Server-side input limits: anything outside these is rejected with a field-specific 400.
const LIMITS = {
  rawMaterialCost: { min: 0, max: 10000000, label: 'raw material cost' },
  laborHours: { min: 0, max: 10000, label: 'labour hours' },
  laborRate: { min: 0, max: 100000, label: 'labour rate' },
  packagingCost: { min: 0, max: 1000000, label: 'packaging cost' },
  transportCost: { min: 0, max: 1000000, label: 'transport/other cost' },
  targetMarginPercent: { min: 0, max: 200, label: 'target margin percent' }
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

// Validates and normalises the request body. Returns { input, errors }.
// Missing optional values become 0 / '' and never crash the calculation.
function validatePricingInput(body) {
  const input = {
    rawMaterialCost: 0,
    laborHours: 0,
    laborRate: 0,
    packagingCost: 0,
    transportCost: 0,
    targetMarginPercent: 0,
    category: '',
    material: '',
    technique: ''
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { input, errors: [{ field: 'body', message: 'Send a JSON object with the pricing inputs' }] }
  }

  const errors = []

  for (const [field, limit] of Object.entries(LIMITS)) {
    const raw = body[field]
    if (raw === undefined || raw === null || raw === '') continue
    const parsed = toNumber(raw)
    if (parsed === null) {
      errors.push({ field, message: `${limit.label} must be a number` })
      continue
    }
    if (parsed < limit.min || parsed > limit.max) {
      errors.push({ field, message: `${limit.label} must be between ${limit.min} and ${limit.max}` })
      continue
    }
    input[field] = parsed
  }

  for (const field of ['category', 'material', 'technique']) {
    const raw = body[field]
    if (raw === undefined || raw === null) continue
    if (typeof raw !== 'string') {
      errors.push({ field, message: `${field} must be text` })
      continue
    }
    const trimmed = raw.trim()
    if (trimmed.length > 60) {
      errors.push({ field, message: `${field} must be 60 characters or fewer` })
      continue
    }
    input[field] = trimmed
  }

  if (!errors.length && input.rawMaterialCost + input.laborHours * input.laborRate <= 0) {
    errors.push({
      field: 'rawMaterialCost',
      message: 'Enter a raw material cost, labour hours or a labour rate so a price can be calculated'
    })
  }

  return { input, errors }
}

function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high)
}

// Builds the full API response. Every number here is derived from the two documented
// formulas above; nothing is random and nothing is presented as a prediction.
function buildPricingSuggestion(input, comparableResult) {
  const rawMaterialCost = Math.round(input.rawMaterialCost)
  const packagingCost = Math.round(input.packagingCost)
  const transportCost = Math.round(input.transportCost)
  const laborCost = Math.round(input.laborHours * input.laborRate)
  const baseCost = rawMaterialCost + laborCost + packagingCost + transportCost
  const targetMarginPercent = input.targetMarginPercent
  const costPlusPrice = Math.round(baseCost * (1 + targetMarginPercent / 100))

  const { anchorPrice, sampleSize, matchTier, matchedFields, anchoringAvailable, anyFieldRequested, comparables } = comparableResult

  const blended = anchoringAvailable ? COST_WEIGHT * costPlusPrice + MARKET_WEIGHT * anchorPrice : costPlusPrice
  const suggestedPrice = Math.max(1, Math.round(clamp(blended, Math.max(baseCost, FLOOR_FACTOR * costPlusPrice), CEILING_FACTOR * costPlusPrice)))
  const minPrice = Math.max(baseCost, Math.round(RANGE_LOW_FACTOR * suggestedPrice))
  const maxPrice = Math.max(costPlusPrice, Math.round(RANGE_HIGH_FACTOR * suggestedPrice))
  const clampingApplied = anchoringAvailable && Math.abs(suggestedPrice - Math.round(blended)) > 1

  const share = (amount) => (baseCost > 0 ? Math.round((amount / baseCost) * 1000) / 10 : 0)

  // Factor codes are language-neutral: the UI maps each code to a translated label and
  // renders the numbers itself, so no user-visible text is duplicated in the backend.
  const factors = [
    { code: 'rawMaterial', amount: rawMaterialCost, shareOfBaseCost: share(rawMaterialCost) },
    { code: 'labor', amount: laborCost, hours: input.laborHours, rate: input.laborRate, shareOfBaseCost: share(laborCost) },
    { code: 'packaging', amount: packagingCost, shareOfBaseCost: share(packagingCost) },
    { code: 'transport', amount: transportCost, shareOfBaseCost: share(transportCost) },
    { code: 'targetMargin', percent: targetMarginPercent, amount: costPlusPrice - baseCost, shareOfBaseCost: share(costPlusPrice - baseCost) }
  ]
  factors.push(anchoringAvailable
    ? { code: 'marketAnchor', anchorPrice, sampleSize, weight: MARKET_WEIGHT, matchTier }
    : { code: 'costBasedOnly' })
  factors.push({ code: 'matchQuality', matchTier, matchedFields, sampleSize })

  const notes = []
  if (!anyFieldRequested) notes.push({ code: 'noProductDetails' })
  if (!anchoringAvailable && anyFieldRequested) notes.push({ code: 'noComparables' })
  if (anchoringAvailable && sampleSize < SMALL_SAMPLE_THRESHOLD) notes.push({ code: 'smallSample', sampleSize })
  if (clampingApplied) notes.push({ code: 'anchoringClamped' })

  const summary = getReferenceSummary()
  const dataSource = `Internal reference dataset: ${summary.file} (${summary.productCount} artisan listings) combined with the cost inputs you entered. No live market, competitor or trend data is used.`
  const disclaimer = `Prototype estimate for guidance only. It is calculated with a transparent cost-plus formula (labour = hours x rate, plus material, packaging and transport, plus your target margin), blended ${Math.round(COST_WEIGHT * 100)}% cost-plus / ${Math.round(MARKET_WEIGHT * 100)}% with the median price of matching reference listings. This is NOT machine learning, NOT live market data and NOT a statistically reliable market forecast. Compare it with your own costs and local demand before setting a price.`

  return {
    currency: 'INR',
    suggestedPrice,
    minPrice,
    maxPrice,
    costBreakdown: { rawMaterialCost, laborCost, packagingCost, transportCost, baseCost, targetMarginPercent, costPlusPrice },
    costModel: {
      costWeight: COST_WEIGHT,
      marketWeight: MARKET_WEIGHT,
      floorFactor: FLOOR_FACTOR,
      ceilingFactor: CEILING_FACTOR,
      rangeLowFactor: RANGE_LOW_FACTOR,
      rangeHighFactor: RANGE_HIGH_FACTOR,
      clampingApplied
    },
    factors,
    comparables,
    sampleSize,
    matchTier,
    matchedFields,
    anchoringAvailable,
    anchorPrice,
    dataSource,
    disclaimer,
    notes,
    referenceDataset: summary
  }
}

module.exports = { COST_WEIGHT, MARKET_WEIGHT, LIMITS, SMALL_SAMPLE_THRESHOLD, buildPricingSuggestion, validatePricingInput }

