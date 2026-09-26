// Product visuals for the marketplace.
//
// These used to point at https://source.unsplash.com, which now answers HTTP 503 for every
// query, so every product card fell through to the textual fallback. Visuals are now generated
// in-process as inline SVG illustrations (data URLs): deterministic, dependency free and fully
// offline. `getProductImage(category, material)` still returns a string usable as an <img> src,
// so ProductCard needs no change and real product images still take precedence there.
//
// Honesty note: these are deliberately simple flat craft illustrations keyed to the product's
// craft family, NOT photographs of the actual product, and each one is captioned as an
// "ILLUSTRATION". No external image host is contacted.

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 210
const CANVAS_CENTER_X = 200
const CANVAS_CENTER_Y = 104

// Deterministic decoration offsets so two products in the same craft family still differ
// (and stay inside the safe area that `object-fit: cover` may crop).
const HORIZONTAL_OFFSETS = [-9, -4, 0, 4, 9]
const VERTICAL_OFFSETS = [-4, 0, 4]
const TILTS = [-2, -1, 0, 1, 2]

// Family palettes reuse the background tokens already defined in src/index.css
// (.product-visual-terracotta, .product-visual-textile, ... were defined but unused in JSX).
// First match wins, so material words are checked before the generic category fallback.
const CRAFT_FAMILIES = [
  {
    key: 'terracotta',
    label: 'TERRACOTTA',
    match: /terracotta|pottery|planter|clay|ceramic/i,
    background: '#f6dfcc',
    ink: '#c2652f',
    inkStrong: '#8e3a25',
    art: ({ ink, inkStrong, background }) =>
      `<ellipse cx="200" cy="60" rx="31" ry="7" fill="${inkStrong}"/>` +
      `<path d="M169 60 C169 100 179 156 200 156 C221 156 231 100 231 60 Z" fill="${ink}"/>` +
      `<path d="M181 72 C181 104 187 134 194 149" fill="none" stroke="${background}" stroke-width="5" opacity=".5" stroke-linecap="round"/>`
  },
  {
    key: 'textile',
    label: 'TEXTILE',
    match: /textile|cotton|silk|handloom|wearable|embroidery|fabric|linen|khadi/i,
    background: '#dfeae2',
    ink: '#5f887d',
    inkStrong: '#8a6a3c',
    art: ({ ink, inkStrong, background }) =>
      `<rect x="150" y="52" width="100" height="28" rx="7" fill="${ink}"/>` +
      `<rect x="157" y="86" width="93" height="28" rx="7" fill="${inkStrong}" opacity=".85"/>` +
      `<rect x="150" y="120" width="100" height="26" rx="7" fill="${ink}"/>` +
      `<g stroke="${background}" stroke-width="2.4" opacity=".5" stroke-linecap="round">` +
      `<path d="M164 52 V80"/><path d="M186 52 V80"/><path d="M208 52 V80"/><path d="M230 52 V80"/>` +
      `<path d="M171 86 V114"/><path d="M193 86 V114"/><path d="M215 86 V114"/><path d="M237 86 V114"/>` +
      `</g>`
  },
  {
    key: 'wool',
    label: 'WOOL',
    match: /wool|woolen|pashmina|felt|shawl|carpet|rug/i,
    background: '#e4e0d6',
    ink: '#b9b2a4',
    inkStrong: '#8d8577',
    art: ({ ink, inkStrong }) =>
      `<circle cx="200" cy="106" r="48" fill="${ink}"/>` +
      `<g fill="none" stroke="${inkStrong}" stroke-width="3" opacity=".6" stroke-linecap="round">` +
      `<path d="M160 84 Q200 106 240 84"/>` +
      `<path d="M158 112 Q200 84 242 112"/>` +
      `<path d="M168 134 Q200 104 232 134"/>` +
      `</g>` +
      `<path d="M244 132 Q262 146 252 156" fill="none" stroke="${ink}" stroke-width="5" opacity=".85" stroke-linecap="round"/>`
  },
  {
    key: 'brass',
    label: 'BRASS',
    match: /brass|jewell|lac\b|lacquer|pendant|bracelet|bangle|necklace|copper|dokra/i,
    background: '#f1e6c7',
    ink: '#bc8128',
    inkStrong: '#d6a342',
    art: ({ ink, inkStrong }) =>
      `<g fill="none" stroke-linecap="round">` +
      `<circle cx="182" cy="104" r="38" stroke="${ink}" stroke-width="11"/>` +
      `<circle cx="226" cy="106" r="34" stroke="${inkStrong}" stroke-width="11"/>` +
      `</g>` +
      `<circle cx="226" cy="72" r="7" fill="${ink}"/>`
  },
  {
    key: 'wood',
    label: 'WOOD',
    match: /wood|rosewood|carving|carved|wall art|teak|sheesham/i,
    background: '#ead9c9',
    ink: '#b87a43',
    inkStrong: '#77472d',
    art: ({ ink, inkStrong, background }) =>
      `<rect x="152" y="56" width="96" height="96" rx="10" fill="${ink}"/>` +
      `<g fill="none" stroke="${inkStrong}" stroke-width="3.5" opacity=".7" stroke-linecap="round">` +
      `<path d="M166 60 C178 86 178 122 166 148"/>` +
      `<path d="M188 58 C200 84 200 124 188 150"/>` +
      `<path d="M212 58 C224 84 224 124 212 150"/>` +
      `<path d="M234 60 C246 86 246 122 234 148"/>` +
      `</g>` +
      `<path d="M200 80 L216 106 L200 132 L184 106 Z" fill="${background}" opacity=".8"/>` +
      `<path d="M200 88 L208 106 L200 124 L192 106 Z" fill="${inkStrong}"/>`
  },
  {
    key: 'fiber',
    label: 'WEAVING',
    match: /basket|woven|weaving|fiber|fibre|cane|bamboo|storage|jute|rope|grass/i,
    background: '#eee3cb',
    ink: '#c48b4d',
    inkStrong: '#8a5a2c',
    art: ({ ink, inkStrong }) =>
      `<path d="M150 68 L250 68 L240 152 L160 152 Z" fill="${ink}"/>` +
      `<rect x="144" y="58" width="112" height="14" rx="7" fill="${inkStrong}"/>` +
      `<g stroke="${inkStrong}" stroke-width="4" opacity=".5" stroke-linecap="round">` +
      `<path d="M153 86 H247"/>` +
      `<path d="M155 104 H245"/>` +
      `<path d="M158 122 H242"/>` +
      `<path d="M161 140 H239"/>` +
      `</g>`
  },
  {
    key: 'paper',
    label: 'PAPER',
    match: /paper|papier|lantern|lighting|mask/i,
    background: '#eee0cf',
    ink: '#d99155',
    inkStrong: '#a8613a',
    art: ({ ink, inkStrong, background }) =>
      `<path d="M200 142 V158" stroke="${inkStrong}" stroke-width="3" stroke-linecap="round"/>` +
      `<rect x="184" y="45" width="32" height="8" rx="4" fill="${inkStrong}"/>` +
      `<rect x="172" y="52" width="56" height="90" rx="16" fill="${ink}"/>` +
      `<g fill="none" stroke="${inkStrong}" stroke-width="3" opacity=".6" stroke-linecap="round">` +
      `<path d="M175 72 H225"/><path d="M175 92 H225"/><path d="M175 112 H225"/>` +
      `</g>` +
      `<circle cx="200" cy="78" r="5" fill="${background}" opacity=".9"/>`
  },
  {
    key: 'stone',
    label: 'STONE',
    match: /stone|marble|inlay|granite|sandstone|soapstone/i,
    background: '#e1e3df',
    ink: '#b9c0b8',
    inkStrong: '#7d8a80',
    art: ({ ink, inkStrong, background }) =>
      `<rect x="160" y="54" width="80" height="96" rx="8" fill="${ink}"/>` +
      `<path d="M168 62 C196 74 206 130 232 142" fill="none" stroke="${background}" stroke-width="2.5" opacity=".4"/>` +
      `<path d="M200 68 L238 102 L200 136 L162 102 Z" fill="${inkStrong}"/>` +
      `<circle cx="200" cy="102" r="7" fill="${background}" opacity=".9"/>`
  },
  {
    key: 'handicraft',
    label: 'HANDICRAFT',
    match: /.*/,
    background: '#e8e0d7',
    ink: '#bf6736',
    inkStrong: '#a64d2b',
    art: ({ ink, inkStrong, background }) =>
      `<path d="M178 64 C186 50 214 50 222 64" fill="none" stroke="${inkStrong}" stroke-width="4" opacity=".8" stroke-linecap="round"/>` +
      `<rect x="158" y="80" width="84" height="72" rx="8" fill="${ink}"/>` +
      `<rect x="150" y="64" width="100" height="20" rx="6" fill="${inkStrong}"/>` +
      `<path d="M200 64 V152" stroke="${background}" stroke-width="10" opacity=".85"/>`
  }
]

// Stable 32-bit-ish hash so the same category/material always gets the same illustration.
function hashValue(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003
  }
  return hash
}

function variantFor(value) {
  const hash = hashValue(value)
  return {
    offsetX: HORIZONTAL_OFFSETS[hash % HORIZONTAL_OFFSETS.length],
    offsetY: VERTICAL_OFFSETS[Math.floor(hash / HORIZONTAL_OFFSETS.length) % VERTICAL_OFFSETS.length],
    tilt: TILTS[Math.floor(hash / (HORIZONTAL_OFFSETS.length * VERTICAL_OFFSETS.length)) % TILTS.length]
  }
}

function findFamily(value) {
  return CRAFT_FAMILIES.find((family) => family.match.test(value)) || CRAFT_FAMILIES[CRAFT_FAMILIES.length - 1]
}

function buildIllustration(family, value) {
  const { offsetX, offsetY, tilt } = variantFor(value)
  const art = family.art(family).trim()
  // `&#183;` keeps the source ASCII; the data URL encoder escapes the leading `#`.
  const caption = `${family.label} &#183; ILLUSTRATION`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}"` +
    ` width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" preserveAspectRatio="xMidYMid slice">` +
    `<title>${family.label} craft illustration</title>` +
    `<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${family.background}"/>` +
    `<ellipse cx="${CANVAS_CENTER_X}" cy="166" rx="92" ry="13" fill="#5a3c28" opacity=".1"/>` +
    `<g transform="translate(${offsetX} ${offsetY}) rotate(${tilt} ${CANVAS_CENTER_X} ${CANVAS_CENTER_Y})">${art}</g>` +
    `<text x="${CANVAS_CENTER_X}" y="190" text-anchor="middle" font-family="Georgia, serif" font-size="12.5"` +
    ` letter-spacing="1.6" fill="#5c4436" opacity=".6">${caption}</text>` +
    `</svg>`
  )
}

// encodeURIComponent leaves the sub-delimiters ( ) ' untouched, which can truncate a data URL
// in stricter parsers, so percent-encode those as well. `#` in hex colours / `&#183;` is already
// escaped by encodeURIComponent, so decoding still yields a byte-exact SVG document.
function encodeSvg(svg) {
  return encodeURIComponent(svg).replace(/[()']/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

// Small bounded cache: the same product pair must always resolve to the same visual, and
// ProductCard re-renders often.
const illustrationCache = new Map()
const CACHE_LIMIT = 250

/**
 * Deterministic, fully offline illustration for a product's craft family.
 * Returns a `data:image/svg+xml` URL string (suitable for an <img> src), never a network URL.
 */
export function getProductImage(category = '', material = '') {
  const value = `${String(category || '')} ${String(material || '')}`.trim()
  const cached = illustrationCache.get(value)
  if (cached) return cached
  const family = findFamily(value)
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeSvg(buildIllustration(family, value))}`
  if (illustrationCache.size >= CACHE_LIMIT) illustrationCache.clear()
  illustrationCache.set(value, dataUrl)
  return dataUrl
}
