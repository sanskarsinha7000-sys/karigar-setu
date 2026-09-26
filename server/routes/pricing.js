// Phase 3: Dynamic Pricing - POST /api/pricing/suggest
//
// Pure computation: no database, no persistence, no authentication change. The engine is a
// transparent cost-plus model (see server/pricing/costModel.js) anchored on the median of
// matching listings from the project's existing 25-product reference dataset
// (src/data/mockProducts.json, read by server/pricing/referenceData.js).
const express = require('express')

const { buildPricingSuggestion, validatePricingInput } = require('../pricing/costModel')
const { findComparables } = require('../pricing/referenceData')

const router = express.Router()

router.post('/suggest', (req, res) => {
  const { input, errors } = validatePricingInput(req.body)
  if (errors.length) {
    return res.status(400).json({ error: errors[0].message, field: errors[0].field, errors })
  }

  try {
    const comparables = findComparables(input)
    return res.json(buildPricingSuggestion(input, comparables))
  } catch (error) {
    console.error('Pricing suggestion failed:', error.message)
    return res.status(500).json({ error: 'Could not read the reference dataset, so no price suggestion is available right now.' })
  }
})

module.exports = router
