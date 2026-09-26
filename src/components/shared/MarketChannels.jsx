import React from 'react'
import { Target } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { getMarketRecommendations } from '../../lib/marketChannels'

// "Where Can You Sell This?" - market channel recommendations for a catalogued product.
//
// The channels and the reason behind each one come entirely from the deterministic rule engine
// in src/lib/marketChannels.js, which reads the product details the artisan has already
// entered. The wording stays neutral ("suitable for", "based on"): this is guidance, never a
// prediction or a promise. No scores are shown.
const REASON_KEYS = {
  category: 'market.reasonCategory',
  technique: 'market.reasonTechnique',
  material: 'market.reasonMaterial',
  bulk: 'market.reasonBulk',
  priceLow: 'market.reasonPriceLow',
  priceMid: 'market.reasonPriceMid',
  priceHigh: 'market.reasonPriceHigh',
  generic: 'market.reasonGeneric'
}

export default function MarketChannels({ category, material, technique, price, title }) {
  const { t } = useTranslation()

  const recommendations = React.useMemo(
    () => getMarketRecommendations({ category, material, technique, price, title }),
    [category, material, technique, price, title]
  )

  if (recommendations.length === 0) return null

  const reasonText = (recommendation) => {
    const key = REASON_KEYS[recommendation.reason] || REASON_KEYS.generic
    return recommendation.value ? t(key, { value: recommendation.value }) : t(key)
  }

  return (
    <section className="bg-white rounded-xl border shadow-sm p-4 lg:col-span-2" aria-labelledby="market-channels-title">
      <h2 id="market-channels-title" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Target size={15} /> {t('market.title')}
      </h2>
      <p className="mt-1 text-xs text-gray-500">{t('market.subtitle')}</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {recommendations.map((recommendation) => (
          <li key={recommendation.channel} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <span className="font-heading text-rust">{t('market.suitableFor')}</span>
              <span>{t(`market.channel.${recommendation.channel}`)}</span>
            </p>
            <p className="mt-1 text-xs text-gray-600">{reasonText(recommendation)}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-gray-500">{t('market.disclaimer')}</p>
    </section>
  )
}
