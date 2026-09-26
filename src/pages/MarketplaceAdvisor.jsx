import React from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from '../i18n'
import { useProductStore } from '../store/productStore'
import MarketChannels from '../components/shared/MarketChannels'

// Marketplace answers one artisan question: "where should I sell this?".
// It is deliberately NOT a shopping page - no cart, no checkout, no product grid. The Shop
// page (/shop, BuyerMarketplace) keeps that role and is untouched.
//
// Flow: type a product -> match it against the product catalog -> hand the matched product's
// own category / material / technique / price / title to the EXISTING rule engine through the
// shared <MarketChannels> component. The channels and the reasons behind them come entirely
// from src/lib/marketChannels.js, so this page adds no second recommendation engine and no
// second reason-wording table. The catalog itself is the app's product store, which is
// seeded from src/data/mockProducts.json.
//
// The search box is seeded from ?query= and the URL is kept in sync, because the existing
// navbar (src/pages/Home.jsx) and the public category cards (src/pages/PublicPage.jsx) already
// deep-link here as /marketplace?query=... - that behaviour is preserved.

// A tiny alias table for the everyday words artisans type that are not literal strings in the
// catalog. It only rewrites the SEARCH TERM; the ranking, channels and reasons are still
// produced entirely by the existing engine. Aliases are only listed where the mapping is
// unambiguous (e.g. the public category card "Jewelry" vs. the catalog's "Jewellery").
const SEARCH_ALIASES = {
  pot: 'planter',
  pots: 'planter',
  pottery: 'terracotta',
  saree: 'scarf',
  sari: 'scarf',
  jewelry: 'jewellery',
  woodcraft: 'wood'
}

const normalise = (value) => String(value == null ? '' : value).trim().toLowerCase()

// Ranks catalog entries against one search term. Strongest signal first: an exact tag, then a
// whole word of the title, then any substring of the title, then a partial match on the tags,
// category or material. Ties keep the first (catalog) entry, so the result is deterministic.
function findProduct(products, rawTerm) {
  const query = normalise(rawTerm)
  if (!query) return null
  const needle = normalise(SEARCH_ALIASES[query] || query)

  let best = null
  products.forEach((product) => {
    const tags = Array.isArray(product.tags) ? product.tags.map(normalise) : []
    const title = normalise(product.title)
    let rank = 0
    if (tags.indexOf(needle) !== -1) rank = 4
    else if (title.split(/\s+/).indexOf(needle) !== -1) rank = 3
    else if (title.indexOf(needle) !== -1) rank = 2
    else if (tags.some((tag) => tag.indexOf(needle) !== -1)) rank = 1
    else if (normalise(product.category).indexOf(needle) !== -1) rank = 1
    else if (normalise(product.material).indexOf(needle) !== -1) rank = 1
    if (rank && (!best || rank > best.rank)) best = { product, rank }
  })

  return best ? best.product : null
}

export default function MarketplaceAdvisor() {
  const { t } = useTranslation()
  const products = useProductStore((s) => s.products)
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('query') || ''
  const [term, setTerm] = React.useState(queryFromUrl)

  // Re-sync when the URL query changes underneath us (navbar search, public category cards).
  React.useEffect(() => { setTerm(queryFromUrl) }, [queryFromUrl])

  const product = React.useMemo(() => findProduct(products, term), [products, term])
  const hasTerm = term.trim().length > 0

  const submit = (event) => {
    event.preventDefault()
    const next = term.trim()
    setSearchParams(next ? { query: next } : {}, { replace: true })
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-heading text-rust">{t('marketplace.advisorTitle')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('marketplace.advisorSubtitle')}</p>
      </header>

      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <label htmlFor="marketplace-product-search" className="text-sm font-semibold text-gray-700">
          {t('marketplace.searchLabel')}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="marketplace-product-search"
              type="search"
              className="w-full p-2 pl-9 border border-gray-200 rounded-md"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t('marketplace.searchPlaceholder')}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-terracotta text-white rounded-md shadow-sm">
            {t('common.search')}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">{t('marketplace.searchHint')}</p>
      </form>

      {hasTerm && !product && (
        <p className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-600">
          {t('marketplace.noMatch')}
        </p>
      )}

      {hasTerm && product && (
        <div className="space-y-4">
          <section className="rounded-xl border border-gray-100 bg-white p-4" aria-labelledby="marketplace-matched-product">
            <h2 id="marketplace-matched-product" className="text-sm font-semibold text-gray-700">
              {t('marketplace.matchedProduct')}
            </h2>
            <p className="mt-1 text-lg font-heading text-gray-900">{product.title}</p>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
              <div className="flex gap-1"><dt className="font-semibold">{t('pricing.category')}:</dt><dd>{product.category}</dd></div>
              <div className="flex gap-1"><dt className="font-semibold">{t('pricing.material')}:</dt><dd>{product.material}</dd></div>
              <div className="flex gap-1"><dt className="font-semibold">{t('pricing.technique')}:</dt><dd>{product.technique}</dd></div>
              <div className="flex gap-1"><dt className="font-semibold">{t('marketplace.price')}:</dt><dd>₹{product.price}</dd></div>
            </dl>
          </section>

          {/* Reused as-is: it calls getMarketRecommendations() and renders the channel name,
              the "suitable for" indication and the reason for each one. */}
          <MarketChannels
            category={product.category}
            material={product.material}
            technique={product.technique}
            price={product.price}
            title={product.title}
          />
        </div>
      )}
    </div>
  )
}

