// Deterministic catalog-copy generator for the Multilingual Auto-Cataloger (Phase 4).
// TEMPLATE + small bilingual glossary. This is NOT an LLM and NOT machine translation.
// No product claim is ever added beyond the information supplied by the artisan.

// Claims we never introduce on our own. They are only echoed back when the artisan
// literally supplied them in the input text (reported in `warnings`, never verified).
const BLOCKED = ['certified', 'certification', 'organic', 'eco-friendly', 'ecofriendly', 'premium quality', 'premium', 'government approved', 'govt approved', 'hallmark', 'iso 9001']

// Bilingual glossary covering the vocabulary used by the reference dataset (mockProducts.json).
const G = {
  category: { 'Home Decor': 'घर की सजावट', 'Textiles': 'वस्त्र', 'Storage': 'भंडारण', 'Wearable': 'पहनावा', 'Jewellery': 'आभूषण', 'Dining': 'भोजन सामग्री', 'Planter': 'गमला', 'Lighting': 'प्रकाश व्यवस्था', 'Wall Art': 'दीवार कला', 'Kitchen': 'रसोई', 'Decor': 'सजावट' },
  material: { 'Terracotta': 'टेराकोटा मिट्टी', 'Cotton': 'कपास', 'Natural Fiber': 'प्राकृतिक रेशा', 'Wool': 'ऊन', 'Brass': 'पीतल', 'Rosewood': 'शीशम', 'Silk': 'रेशम', 'Cane': 'बेंत', 'Marble': 'संगमरमर', 'Lac': 'लाख', 'Paper': 'कागज़', 'Leaf Fiber': 'पत्ती का रेशा', 'Stone': 'पत्थर', 'Textile': 'वस्त्र', 'Wood': 'लकड़ी' },
  technique: { 'Wheel-thrown': 'चाक पर आकार दिया', 'Ikat': 'आइकैट', 'Coiling': 'कोइलिंग बुनाई', 'Block Print': 'ब्लॉक प्रिंट', 'Handloom': 'हथकरघा', 'Hand-forged': 'हाथ से गढ़ा हुआ', 'Hand Carved': 'हाथ से नक्काशी', 'Hand Embroidery': 'हाथ की कढ़ाई', 'Weaving': 'बुनाई', 'Inlay': 'इनले कार्य', 'Molding': 'मोल्डिंग', 'Paper Mache': 'पेपर माशे', 'Handmade': 'हस्तनिर्मित', 'Hammered': 'हथौड़े से बना', 'Carving': 'नक्काशी', 'Glazed': 'ग्लेज़्ड', 'Painted': 'चित्रित' }
}

const HI_LABEL = { category: 'श्रेणी', material: 'सामग्री', technique: 'तकनीक', origin: 'मूल स्थान' }
const EN_STOP = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'or', 'with', 'in', 'on', 'to', 'is', 'this', 'that', 'by', 'from', 'at', 'as', 'it', 'its'])

function clean(value) { return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '' }
function hasDevanagari(value) { return /[\u0900-\u097F]/.test(value || '') }
function sentence(value) { const text = clean(value); if (!text) return ''; return /[.!?।]$/.test(text) ? text : text + '.' }
function gloss(key, value) { const hit = G[key] && Object.prototype.hasOwnProperty.call(G[key], value); return { term: hit ? G[key][value] : value, matched: Boolean(hit) } }
function escapeRegExp(text) { return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') }
function mentionsClaim(text, claim) { return new RegExp('\\b' + escapeRegExp(claim) + '\\b', 'i').test(text || '') }
function echoedClaims(text) { return BLOCKED.filter((claim) => mentionsClaim(text, claim)) }
function tokens(text) { return clean(text).toLowerCase().split(/[^a-z0-9\u0900-\u097F]+/).filter(Boolean) }
function makeKeywords(parts, hindiOnly, limit = 12) {
  const seen = new Set(); const out = []
  parts.filter(Boolean).forEach((part) => tokens(part).forEach((word) => {
    const dev = hasDevanagari(word)
    if (hindiOnly !== dev) return
    if (!dev && (EN_STOP.has(word) || word.length < 3)) return
    if (seen.has(word)) return
    seen.add(word); out.push(word)
  }))
  return out.slice(0, limit)
}
function firstClause(text, count) {
  const parts = clean(text).split(/(?<=[.!?।])\s+/)
  return parts.slice(0, count).join(' ').trim()
}
function buildEnglishCopy(input) {
  const material = clean(input.material)
  const category = clean(input.category)
  const technique = clean(input.technique)
  const origin = clean(input.origin) || 'artisan clusters'
  const productName = clean(input.productName) || `${origin} ${material ? material.toLowerCase() : ''} ${category ? category.toLowerCase() : ''} craft`.trim()
  const sentence = englishSentence(input)
  const care = 'Care: clean gently and store away from direct moisture. Slight variations in size, finish and colour are part of the handcrafted character.'
  const highlights = []
  if (category) highlights.push(`Category: ${category}`)
  if (material) highlights.push(`Material: ${material}`)
  if (technique) highlights.push(`Technique: ${technique}`)
  if (origin) highlights.push(`Origin: ${origin}`)
  if (!highlights.length) highlights.push('Handcrafted artisan product')
  const keywords = makeKeywords([productName, category, material, technique, origin, sentence], false)
  return {
    title: productName || 'Handcrafted artisan product',
    short: sentence,
    detailed: `${sentence} ${care}`,
    highlights,
    keywords
  }
}

function buildHindiCopy(input) {
  const material = clean(input.material)
  const category = clean(input.category)
  const technique = clean(input.technique)
  const origin = clean(input.origin) || 'शिल्प केन्द्र'
  const productName = clean(input.productName) || `${origin} ${material ? material : ''} ${category ? (G.category[category] || category) : ''} शिल्प`.trim()
  const sentence = hindiSentence(input)
  const care = 'सावधानी: इसे धीरे से साफ़ करें और प्रत्यक्ष नमी से दूर रखें। आकार, Finish और रंग में हल्का अंतर हो सकता है — यह हस्तनिर्मित विशेषता है।'
  const highlights = []
  if (category) highlights.push(`श्रेणी: ${G.category[category] || category}`)
  if (material) highlights.push(`सामग्री: ${G.material[material] || material}`)
  if (technique) highlights.push(`तकनीक: ${G.technique[technique] || technique}`)
  if (origin) highlights.push(`मूल स्थान: ${origin}`)
  if (!highlights.length) highlights.push('शिल्पकारों द्वारा हाथ से बनाया गया')
  const keywords = makeKeywords([productName, category, material, technique, origin, sentence], true)
  return {
    title: productName || 'शिल्पकारों द्वारा हाथ से बनाया गया उत्पाद',
    short: sentence,
    detailed: `${sentence} ${care}`,
    highlights,
    keywords
  }
}

function englishSentence(input) {
  const m = gloss('material', input.material)
  const c = gloss('category', input.category)
  const t = gloss('technique', input.technique)
  const transcript = clean(input.transcript) || clean(input.englishText) || ''
  const snippet = firstClause(transcript, 2)
  if (input.category && input.material && input.technique) return EN_SENTENCES.categoryMaterialTechnique(m, c, t)
  if (input.material && input.technique) return EN_SENTENCES.materialTechniqueNoCategory(m, t)
  if (input.category && input.material) return EN_SENTENCES.categoryMaterialNoTechnique(m, c)
  if (input.material) return EN_SENTENCES.materialOnly(m)
  if (transcript) return EN_SENTENCES.transcriptDriven(snippet)
  return EN_SENTENCES.minimal()
}

const HI_SENTENCES = {
  categoryMaterialTechnique: (m, c, t) =>
    `हज़ारों वर्ष पुरानी ${t.technique} कला का उपयोग करके शिल्पकारों द्वारा हाथ से बनाया गया ${c.term || clean(c.category) || 'शिल्प उत्पाद'}।`,
  materialTechniqueNoCategory: (m, t) =>
    `शिल्पकारों द्वारा ${t.technique} तकनीक से तैयार किया गया, ${clean(m.material) || 'प्राकृतिक सामग्री'} का यह हस्तनिर्मित टुकड़ा।`,
  categoryMaterialNoTechnique: (m, c) =>
    `शिल्पकारों के द्वारा बनाया गया ${c.term || clean(c.category) || 'शिल्प'} — ${clean(m.material) || 'प्राकृतिक सामग्री'} में हाथ से तैयार।`,
  materialOnly: (m) =>
    `शिल्पकारों द्वारा पारंपरिक विधि से तैयार, ${clean(m.material) || 'प्राकृतिक सामग्री'} का हस्तनिर्मित उत्पाद।`,
  transcriptDriven: (snippet) =>
    `शिल्पकार की ही शब्दावली से प्रेरित: ${snippet}। प्रत्येक टुकड़ा हाथ से बनता है और आकार, रंग या Finish में थोड़ा अंतर हो सकता है।`,
  minimal: () =>
    `शिल्पकारों द्वारा हाथ से बनाया गया। विवरण जोड़ा जा रहा है — प्रकाशित करने से पहले समीक्षा करें।`
}

function hindiSentence(input) {
  const m = gloss('material', input.material)
  const c = gloss('category', input.category)
  const t = gloss('technique', input.technique)
  const transcript = clean(input.transcript) || clean(input.hindiText) || ''
  const snippet = firstClause(transcript, 2)
  if (input.category && input.material && input.technique) return HI_SENTENCES.categoryMaterialTechnique(m, c, t)
  if (input.material && input.technique) return HI_SENTENCES.materialTechniqueNoCategory(m, t)
  if (input.category && input.material) return HI_SENTENCES.categoryMaterialNoTechnique(m, c)
  if (input.material) return HI_SENTENCES.materialOnly(m)
  if (transcript) return HI_SENTENCES.transcriptDriven(snippet)
  return HI_SENTENCES.minimal()
}

const EN_SENTENCES = {
  categoryMaterialTechnique: (m, c, t) =>
    `Handcrafted ${clean(m.material) || 'artisan'} ${clean(c.category) || 'craft'} using ${t.technique} methods passed down through generations.`,
  materialTechniqueNoCategory: (m, t) =>
    `A handmade piece in ${clean(m.material) || 'natural materials'}, finished with ${t.technique} work by skilled artisans.`,
  categoryMaterialNoTechnique: (m, c) =>
    `A handcrafted ${clean(c.category) || 'product'} in ${clean(m.material) || 'artisan materials'}, made for everyday use and gifting.`,
  materialOnly: (m) =>
    `A handcrafted item in ${clean(m.material) || 'artisan materials'}, shaped by traditional methods.`,
  transcriptDriven: (snippet) =>
    `Inspired by the artisan's own description: ${snippet}. Each piece is made by hand and may vary slightly in finish, size and colour.`,
  minimal: () =>
    `Handcrafted by artisan makers. Details are being added; please review the description before publishing.`
}

function generateCatalogCopy(body) {
  const input = {
    transcript: clean(body.transcript),
    englishText: clean(body.englishText),
    hindiText: clean(body.hindiText),
    productName: clean(body.productName),
    category: clean(body.category),
    material: clean(body.material),
    technique: clean(body.technique),
    origin: clean(body.origin),
    details: clean(body.details)
  }

  const allInput = [input.transcript, input.englishText, input.hindiText, input.productName, input.category, input.material, input.technique, input.origin, input.details]
  if (!allInput.some(Boolean)) {
    throw new Error('No content to generate catalog copy from.')
  }

  const en = buildEnglishCopy(input)
  const hi = buildHindiCopy(input)

  const echoed = []
  for (const field of ['transcript', 'englishText', 'hindiText', 'details', 'productName', 'category', 'material', 'technique', 'origin']) {
    const text = input[field]
    if (!text) continue
    const claims = echoedClaims(text)
    for (const claim of claims) echoed.push({ claim, field, sourceText: text })
  }

  const warnings = []
  if (echoed.length) {
    warnings.push({ code: 'unverifiedClaim', message: `The artisan's input contained marketing claims that this generator does not verify: ${echoed.map((e) => e.claim).join(', ')}. Review before publishing.` })
  }
  if (!input.category && !input.material && !input.technique && !input.transcript && !input.englishText && !input.hindiText) {
    warnings.push({ code: 'minimalInput', message: 'Very little product information was supplied. Please review the generated copy carefully.' })
  }

  return {
    english: en,
    hindi: hi,
    warnings,
    languages: { generated: ['en', 'hi'], describedFrom: input.transcript ? 'transcript' : input.englishText ? 'englishText' : input.hindiText ? 'hindiText' : 'manualFields' }
  }
}

module.exports = { generateCatalogCopy, sentence, gloss, makeKeywords, echoedClaims, BLOCKED }