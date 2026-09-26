// Market Channel Recommendations - deterministic, rule-based guidance for artisans.
//
// Given the product details that ALREADY exist in the app (category, material, technique,
// price and optionally a title), this module returns the market channels that suit the
// product. It is a transparent, inspectable rule set - not an AI/LLM feature, not a model,
// and it makes no network calls or storage. Nothing here duplicates the pricing engine: the
// price is only read as one signal among several.
//
// Rule groups, in the order their reasons take precedence:
//   category  - which kind of product it is
//   technique - how it is made (craft skill, regional/distinctive, reproducible)
//   material  - what it is made of (premium, textile, earthen, paper, ...)
//   price     - a simple band over the price range used by the reference dataset
//   bulk      - a production-method signal for repeat/bulk orders
//
// The category / material / technique values below are exactly the values that exist in
// src/data/mockProducts.json (the same dataset the pricing page offers in its dropdowns).
// Nothing is invented: unknown values simply match no rule and fall through to the generic set.

export const MARKET_CHANNELS = [
  'localMarkets',
  'tourismSouvenir',
  'onlineMarketplaces',
  'hotelResort',
  'corporateGifting',
  'homeDecorStores',
  'boutiqueRetail',
  'wholesaleBulk'
]

const CHANNEL_RANK = new Map(MARKET_CHANNELS.map((channel, index) => [channel, index]))

// Rule weights. These are simple, inspectable ranking signals - not a claim about any outcome.
const RULE_POINTS = {
  category: 4,
  technique: 3,
  material: 2,
  bulk: 2,
  price: 1
}

// The price bands are simple and are only a signal. They are relative to the range the
// existing reference listings use (roughly 300 - 4800), and they never claim an outcome.
export const PRICE_BANDS = [
  { id: 'low', max: 999 },
  { id: 'mid', max: 2999 },
  { id: 'high', max: Infinity }
]

// --- rules ---------------------------------------------------------------------------
// Each rule: the existing product values it matches, the channels it supports, and the
// reason source used to explain the recommendation.

const CATEGORY_RULES = [
  { values: ['Home Decor', 'Decor', 'Planter', 'Wall Art'], channels: ['homeDecorStores', 'localMarkets', 'tourismSouvenir', 'onlineMarketplaces'] },
  { values: ['Kitchen', 'Dining'], channels: ['homeDecorStores', 'localMarkets', 'onlineMarketplaces', 'hotelResort'] },
  { values: ['Storage'], channels: ['homeDecorStores', 'wholesaleBulk', 'onlineMarketplaces', 'localMarkets'] },
  { values: ['Textiles', 'Wearable'], channels: ['onlineMarketplaces', 'boutiqueRetail', 'localMarkets', 'corporateGifting'] },
  { values: ['Jewellery'], channels: ['boutiqueRetail', 'tourismSouvenir', 'onlineMarketplaces', 'corporateGifting'] },
  { values: ['Lighting'], channels: ['boutiqueRetail', 'homeDecorStores', 'hotelResort', 'onlineMarketplaces'] }
]

const MATERIAL_RULES = [
  { values: ['Brass', 'Marble', 'Rosewood', 'Stone'], channels: ['boutiqueRetail', 'hotelResort', 'homeDecorStores'] },
  { values: ['Silk', 'Wool', 'Cotton', 'Textile', 'Natural Fiber'], channels: ['onlineMarketplaces', 'boutiqueRetail', 'corporateGifting'] },
  { values: ['Terracotta', 'Cane', 'Wood', 'Leaf Fiber', 'Lac'], channels: ['localMarkets', 'homeDecorStores', 'tourismSouvenir'] },
  { values: ['Paper'], channels: ['localMarkets', 'tourismSouvenir', 'onlineMarketplaces'] }
]

const TECHNIQUE_RULES = [
  { values: ['Block Print', 'Ikat', 'Embroidery', 'Hand Embroidery', 'Handloom', 'Weaving', 'Painted'], channels: ['tourismSouvenir', 'localMarkets', 'onlineMarketplaces'] },
  { values: ['Carving', 'Hand Carved', 'Inlay', 'Hammered', 'Hand-forged'], channels: ['boutiqueRetail', 'tourismSouvenir', 'hotelResort'] },
  { values: ['Wheel-thrown', 'Coiling', 'Glazed'], channels: ['homeDecorStores', 'localMarkets', 'tourismSouvenir', 'onlineMarketplaces'] },
  { values: ['Paper Mache'], channels: ['localMarkets', 'tourismSouvenir', 'onlineMarketplaces'] },
  { values: ['Handmade'], channels: ['localMarkets', 'onlineMarketplaces'] }
]

// Reproducible production methods suit repeat orders and bulk buyers.
const BULK_TECHNIQUES = ['Molded', 'Molding', 'Block Print', 'Weaving', 'Handloom', 'Glazed']

const PRICE_RULE_CHANNELS = {
  low: ['localMarkets', 'tourismSouvenir', 'onlineMarketplaces', 'corporateGifting'],
  mid: ['onlineMarketplaces', 'boutiqueRetail', 'homeDecorStores', 'localMarkets'],
  high: ['boutiqueRetail', 'hotelResort', 'homeDecorStores', 'corporateGifting']
}

// Used when the product details do not match any rule, so the section is never empty.
const GENERIC_CHANNELS = ['localMarkets', 'onlineMarketplaces', 'tourismSouvenir']

const clean = (value) => String(value == null ? '' : value).trim().toLowerCase()

const priceBand = (price) => {
  const amount = Number(price)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return PRICE_BANDS.find((band) => amount <= band.max).id
}

function matchedValues(rules, value) {
  const target = clean(value)
  if (!target) return []
  return rules.filter((rule) => rule.values.some((entry) => clean(entry) === target))
}

/**
 * getMarketRecommendations({ category, material, technique, price, title })
 *
 * Returns a ranked array of { channel, reason, value, score }:
 *   channel - key from MARKET_CHANNELS
 *   reason  - the rule source that decided this channel: 'category' | 'technique' | 'material' |
 *             'bulk' | 'priceLow' | 'priceMid' | 'priceHigh' | 'generic'
 *   value   - the product value that triggered the rule (e.g. 'Handloom' or 'low')
 *   score   - internal ranking points; not shown in the UI
 *
 * Deterministic: the same input always produces the same output, because scores are integers
 * added from a fixed rule set and ties break on the fixed MARKET_CHANNELS order. At least
 * three channels are always returned, so the section is never empty.
 */
export function getMarketRecommendations(product = {}) {
  const scores = new Map()
  const reasons = new Map()
  // The reason shown for a channel is the rule that actually contributed the most points to
  // that channel, so the explanation always matches the dominant rule rather than a fixed order.
  const add = (channel, points, reason, value) => {
    const previous = scores.get(channel) || 0
    scores.set(channel, previous + points)
    const current = reasons.get(channel)
    if (!current || points > current.points) reasons.set(channel, { reason, value, points })
  }

  // Each rule group scores its channels and records why they were suggested. The points are
  // only a ranking signal; they are never shown to the artisan.
  const applyRules = (rules, value, points, reason) => {
    matchedValues(rules, value).forEach((rule) => {
      rule.channels.forEach((channel) => add(channel, points, reason, value))
    })
  }

  // category -> the strongest single signal
  applyRules(CATEGORY_RULES, product.category, RULE_POINTS.category, 'category')
  // technique
  applyRules(TECHNIQUE_RULES, product.technique, RULE_POINTS.technique, 'technique')
  // material
  applyRules(MATERIAL_RULES, product.material, RULE_POINTS.material, 'material')

  // A reproducible production method suits repeat orders and bulk buyers.
  if (BULK_TECHNIQUES.some((entry) => clean(entry) === clean(product.technique))) {
    ;['wholesaleBulk', 'corporateGifting'].forEach((channel) => add(channel, RULE_POINTS.bulk, 'bulk', product.technique))
  }

  // price band -> the band is reported so the reason can name it
  const band = priceBand(product.price)
  if (band) {
    PRICE_RULE_CHANNELS[band].forEach((channel) => add(channel, RULE_POINTS.price, `price${band.charAt(0).toUpperCase()}${band.slice(1)}`, band))
  }

  // If nothing matched, seed the generic channels so the section is never empty.
  if (scores.size === 0) {
    GENERIC_CHANNELS.forEach((channel) => add(channel, 1, 'generic', ''))
  }

  const ranked = [...scores.entries()]
    .map(([channel, score]) => {
      const reason = reasons.get(channel) || { reason: 'generic', value: '' }
      return { channel, score, reasonSource: reason.reason, value: reason.value }
    })
    .sort((a, b) => b.score - a.score || CHANNEL_RANK.get(a.channel) - CHANNEL_RANK.get(b.channel))

  // Guarantee a useful minimum even if a product matches very few rules.
  const LIMIT = 4
  const MINIMUM = 3
  const picked = ranked.slice(0, LIMIT)
  if (picked.length < MINIMUM) {
    for (const channel of GENERIC_CHANNELS) {
      if (picked.length >= MINIMUM) break
      if (!picked.some((item) => item.channel === channel)) {
        picked.push({ channel, score: 0, reasonSource: 'generic', value: '' })
      }
    }
  }
  // Keep the deterministic order after topping up.
  picked.sort((a, b) => b.score - a.score || CHANNEL_RANK.get(a.channel) - CHANNEL_RANK.get(b.channel))

  return picked.map(({ channel, score, reasonSource, value }) => ({ channel, reason: reasonSource, value, score }))
}

export default getMarketRecommendations

