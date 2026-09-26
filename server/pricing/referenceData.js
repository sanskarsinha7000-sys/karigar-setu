// Phase 3: Dynamic Pricing - reference / comparable listing access.
//
// DATA SOURCE: the project's EXISTING 25-product dataset at src/data/mockProducts.json.
// This module READS that file; it does not create or maintain a second copy of the data
// (the frontend store imports the very same file). These 25 listings are internal
// prototype reference data. They are NOT live market data, NOT competitor prices and
// contain no historical/trend information. Nothing of that kind is invented here.
//
// MATCHING is deterministic and explainable:
//   * values are normalised (trim, lowercase, non-alphanumeric -> single space)
//   * a small hand-written alias table (below) bridges the vocabulary used by the vision
//     service taxonomy (/analyze in vision-service/main.py) and the dataset vocabulary.
//     It is a plain lookup table - NOT learned weights, NOT machine learning.
//   * each listing is scored: category +2, material +2, technique +1
//   * a listing qualifies as comparable at score >= 2, i.e. it shares at least the
//     category OR the material with the requested product
//   * the market anchor is the MEDIAN price of ALL qualifying listings (median is used
//     because it is robust to single extreme prices)
const fs = require('node:fs')
const path = require('node:path')

const DATASET_PATH = path.join(__dirname, '..', '..', 'src', 'data', 'mockProducts.json')

const FIELD_SCORE = { category: 2, material: 2, technique: 1 }
const MIN_COMPARABLE_SCORE = 2
const DEFAULT_COMPARABLE_LIMIT = 5

function normalizeToken(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// Only UNAMBIGUOUS equivalences are listed. Ambiguous taxonomy words (for example
// "Embroidery" or "Paper Mache", which the dataset spreads across several categories)
// are deliberately NOT aliased so that no false market anchor is ever claimed.
const CATEGORY_ALIASES = {
  decor: 'home decor',
  'basket weaving': 'storage',
  'brass or metal jewelry': 'jewellery',
  'stone inlay': 'home decor',
  'wood carving': 'home decor'
}

const MATERIAL_ALIASES = {
  clay: 'terracotta',
  rosewood: 'wood',
  cane: 'natural fiber',
  'leaf fiber': 'natural fiber',
  bamboo: 'natural fiber'
}

const TECHNIQUE_ALIASES = {
  'hand painted': 'painted',
  embroidered: 'hand embroidery',
  'block printed': 'block print',
  woven: 'weaving',
  coiled: 'coiling',
  carved: 'carving',
  'hand carved': 'carving',
  molded: 'molding',
  'stone inlaid': 'inlay',
  'lac turned': 'molding'
}

function canonicalToken(aliasMap, value) {
  const token = normalizeToken(value)
  if (!token) return ''
  return aliasMap[token] || token
}

let cachedDataset = null

function loadDataset() {
  if (cachedDataset) return cachedDataset
  const raw = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'))
  if (!Array.isArray(raw)) throw new Error('Reference dataset must be a JSON array')
  cachedDataset = raw
    .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && Number.isFinite(Number(item.price)))
    .map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category ? String(item.category) : '',
      material: item.material ? String(item.material) : '',
      technique: item.technique ? String(item.technique) : '',
      price: Math.round(Number(item.price))
    }))
  return cachedDataset
}

function getReferenceProducts() {
  return loadDataset().map((product) => ({ ...product }))
}

// Distinct option values taken straight from the dataset, so the UI can only offer
// values that real comparable listings actually use.
function getReferenceOptions() {
  const distinct = (key) => [...new Set(loadDataset().map((p) => p[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return {
    categories: distinct('category'),
    materials: distinct('material'),
    techniques: distinct('technique')
  }
}

function getReferenceSummary() {
  const products = loadDataset()
  const prices = products.map((product) => product.price)
  const options = getReferenceOptions()
  return {
    file: 'src/data/mockProducts.json',
    productCount: products.length,
    categoryCount: options.categories.length,
    materialCount: options.materials.length,
    techniqueCount: options.techniques.length,
    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null
  }
}

function scoreListing(product, wanted) {
  const matchedFields = []
  if (wanted.category && canonicalToken(CATEGORY_ALIASES, product.category) === wanted.category) matchedFields.push('category')
  if (wanted.material && canonicalToken(MATERIAL_ALIASES, product.material) === wanted.material) matchedFields.push('material')
  if (wanted.technique && canonicalToken(TECHNIQUE_ALIASES, product.technique) === wanted.technique) matchedFields.push('technique')
  const score = matchedFields.reduce((total, field) => total + FIELD_SCORE[field], 0)
  return { score, matchedFields }
}

// Median (not mean) so that one unusual reference price cannot drag the anchor.
function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle]
}

// Returns the qualifying comparable listings plus the anchoring facts the API reports.
function findComparables(input = {}, limit = DEFAULT_COMPARABLE_LIMIT) {
  const wanted = {
    category: canonicalToken(CATEGORY_ALIASES, input.category),
    material: canonicalToken(MATERIAL_ALIASES, input.material),
    technique: canonicalToken(TECHNIQUE_ALIASES, input.technique)
  }
  const anyFieldRequested = Boolean(wanted.category || wanted.material || wanted.technique)

  const scored = []
  for (const product of loadDataset()) {
    const { score, matchedFields } = scoreListing(product, wanted)
    if (score >= MIN_COMPARABLE_SCORE) scored.push({ ...product, matchScore: score, matchedFields })
  }
  scored.sort((a, b) => (b.matchScore - a.matchScore) || (a.price - b.price) || a.id.localeCompare(b.id))

  const prices = scored.map((comparable) => comparable.price)
  return {
    comparables: scored.slice(0, Math.max(1, limit)),
    sampleSize: scored.length,
    anchorPrice: median(prices),
    matchTier: scored.length ? scored[0].matchedFields.join('+') : null,
    matchedFields: ['category', 'material', 'technique'].filter((field) => scored.some((c) => c.matchedFields.includes(field))),
    anchoringAvailable: scored.length > 0,
    anyFieldRequested
  }
}

module.exports = {
  CATEGORY_ALIASES,
  MATERIAL_ALIASES,
  TECHNIQUE_ALIASES,
  DATASET_PATH,
  canonicalToken,
  findComparables,
  getReferenceOptions,
  getReferenceProducts,
  getReferenceSummary,
  normalizeToken
}
