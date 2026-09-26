import React, { useState } from 'react'
import { Calculator, Info, Loader2, RefreshCw, Scale, TrendingUp } from 'lucide-react'
import { useTranslation } from '../i18n'
import { suggestPrice } from '../lib/pricingClient'
import MarketChannels from '../components/shared/MarketChannels'
import referenceProducts from '../data/mockProducts.json'

// Phase 3: Dynamic Pricing. Cost inputs + product details go to POST /api/pricing/suggest
// (Express -> server/pricing/costModel.js). The engine is a transparent cost-plus formula
// anchored on the median of matching listings from the project's existing 25-product
// reference dataset. It is NOT machine learning and NOT live market data - the page says so.
//
// The option lists are derived from the same dataset file the backend reads, so the form can
// only offer categories/materials/techniques that real reference listings actually use.
const DEFAULTS = {
  rawMaterialCost: 500,
  laborHours: 6,
  laborRate: 150,
  packagingCost: 40,
  transportCost: 60,
  targetMarginPercent: 30,
  category: '',
  material: '',
  technique: ''
}

const distinct = (field) => [...new Set(referenceProducts.map((product) => product[field]).filter(Boolean))].sort()
const OPTIONS = {
  categories: distinct('category'),
  materials: distinct('material'),
  techniques: distinct('technique')
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const formatINR = (value) => inr.format(Number(value) || 0)

const FACTOR_KEYS = {
  rawMaterial: 'factorRawMaterial',
  labor: 'factorLabor',
  packaging: 'factorPackaging',
  transport: 'factorTransport',
  targetMargin: 'factorTargetMargin',
  marketAnchor: 'factorMarketAnchor',
  costBasedOnly: 'factorCostBasedOnly',
  matchQuality: 'factorMatchQuality'
}

const NOTE_KEYS = {
  noProductDetails: 'noteNoProductDetails',
  noComparables: 'noteNoComparables',
  smallSample: 'noteSmallSample',
  anchoringClamped: 'noteAnchoringClamped'
}

export default function DynamicPricing() {
  const { t } = useTranslation()
  const [form, setForm] = useState(DEFAULTS)
  const [result, setResult] = useState(null)
  const [finalPrice, setFinalPrice] = useState('')
  const [isCalculating, setCalculating] = useState(false)
  const [error, setError] = useState('')

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const tierLabel = (tier) => (tier ? tier.split('+').map((part) => t(`pricing.${part}`)).join(' + ') : t('pricing.matchTierNone'))

  const factorText = (factor) => {
    const key = FACTOR_KEYS[factor.code]
    if (!key) return ''
    switch (factor.code) {
      case 'labor': return t(`pricing.${key}`, { hours: factor.hours, rate: factor.rate })
      case 'targetMargin': return t(`pricing.${key}`, { percent: factor.percent })
      case 'marketAnchor': return t(`pricing.${key}`, { price: factor.anchorPrice, count: factor.sampleSize, weight: Math.round(factor.weight * 100) })
      case 'matchQuality': return t(`pricing.${key}`, { tier: tierLabel(factor.matchTier) })
      default: return t(`pricing.${key}`)
    }
  }

  const factorAmount = (factor) => {
    if (factor.code === 'marketAnchor' || factor.code === 'costBasedOnly' || factor.code === 'matchQuality') return ''
    const amount = formatINR(factor.amount)
    return factor.shareOfBaseCost === undefined ? amount : `${amount} · ${t('pricing.shareOfBaseCost', { share: factor.shareOfBaseCost })}`
  }

  const calculate = async () => {
    const numericFields = ['rawMaterialCost', 'laborHours', 'laborRate', 'packagingCost', 'transportCost', 'targetMarginPercent']
    const invalid = numericFields.find((field) => form[field] === '' || Number.isNaN(Number(form[field])) || Number(form[field]) < 0)
    if (invalid) {
      setError(t('pricing.errorNumeric'))
      setResult(null)
      return
    }
    if (Number(form.rawMaterialCost) + Number(form.laborHours) * Number(form.laborRate) <= 0) {
      setError(t('pricing.errorCosts'))
      setResult(null)
      return
    }

    setCalculating(true)
    setError('')
    try {
      const payload = await suggestPrice({
        rawMaterialCost: Number(form.rawMaterialCost),
        laborHours: Number(form.laborHours),
        laborRate: Number(form.laborRate),
        packagingCost: Number(form.packagingCost),
        transportCost: Number(form.transportCost),
        targetMarginPercent: Number(form.targetMarginPercent),
        category: form.category,
        material: form.material,
        technique: form.technique
      })
      setResult(payload)
      setFinalPrice(String(payload.suggestedPrice))
    } catch (requestError) {
      setResult(null)
      setError(requestError?.message || t('pricing.errorFailed'))
    } finally {
      setCalculating(false)
    }
  }

  const laborFactor = result ? (result.factors.find((factor) => factor.code === 'labor') || {}) : {}
  const numberFields = [
    ['rawMaterialCost', 'rawMaterialCost'],
    ['laborHours', 'laborHours'],
    ['laborRate', 'laborRate'],
    ['packagingCost', 'packagingCost'],
    ['transportCost', 'transportCost'],
    ['targetMarginPercent', 'targetMargin']
  ]
  const inputClass = 'w-full mt-1 p-2 border border-gray-200 rounded-md'
  const labelClass = 'text-xs font-medium text-gray-600'

  return (
    <div>
      <h1 className="text-2xl font-heading text-rust">{t('nav.dynamicPricing')}</h1>
      <p className="mt-2 max-w-3xl text-sm text-gray-600">{t('pricing.subtitle')}</p>

      <div className="mt-4 bg-white rounded-xl border shadow-sm p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Scale size={15} /> {t('pricing.productDetails')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('pricing.productDetailsHint')}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={labelClass}>{t('pricing.category')}</span>
            <select className={inputClass} value={form.category} onChange={(event) => setField('category', event.target.value)}>
              <option value="">{t('pricing.notSpecified')}</option>
              {OPTIONS.categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>{t('pricing.material')}</span>
            <select className={inputClass} value={form.material} onChange={(event) => setField('material', event.target.value)}>
              <option value="">{t('pricing.notSpecified')}</option>
              {OPTIONS.materials.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>{t('pricing.technique')}</span>
            <select className={inputClass} value={form.technique} onChange={(event) => setField('technique', event.target.value)}>
              <option value="">{t('pricing.notSpecified')}</option>
              {OPTIONS.techniques.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>

        <h2 className="mt-5 flex items-center gap-2 text-sm font-semibold text-gray-700"><Calculator size={15} /> {t('pricing.costInputs')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {numberFields.map(([field, key]) => (
            <label key={field} className="block">
              <span className={labelClass}>{t(`pricing.${key}`)}</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                className={inputClass}
                value={form[field]}
                onChange={(event) => setField(field, event.target.value)}
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">{t('pricing.currencyHint')}</p>

        <div className="mt-4">
          <button
            type="button"
            onClick={calculate}
            disabled={isCalculating}
            className="flex items-center gap-2 rounded-md bg-terracotta px-4 py-2 text-sm text-white shadow-sm disabled:opacity-60"
          >
            {isCalculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
            {isCalculating ? t('pricing.calculating') : t('pricing.calculate')}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
      {result && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><TrendingUp size={15} /> {t('pricing.suggestedPrice')}</h2>
            <p className="mt-2 font-heading text-3xl text-rust">{formatINR(result.suggestedPrice)}</p>
            <p className="mt-3 text-xs font-medium text-gray-600">{t('pricing.range')}</p>
            <p className="mt-1 text-sm text-gray-700">
              {t('pricing.minimum')}: <strong>{formatINR(result.minPrice)}</strong>
              {' · '}
              {t('pricing.maximum')}: <strong>{formatINR(result.maxPrice)}</strong>
            </p>
            <p className="mt-1 text-xs text-gray-500">{t('pricing.rangeHint')}</p>

            <div className="mt-4 border-t pt-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">{t('pricing.yourPrice')}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1 w-full p-2 border border-gray-200 rounded-md"
                  value={finalPrice}
                  onChange={(event) => setFinalPrice(event.target.value)}
                />
              </label>
              <button type="button" onClick={() => setFinalPrice(String(result.suggestedPrice))} className="mt-2 flex items-center gap-1 text-xs text-rust">
                <RefreshCw size={13} /> {t('pricing.useSuggested')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700">{t('pricing.costBreakdown')}</h2>
            <dl className="mt-2 space-y-1 text-sm text-gray-700">
              <div className="flex justify-between gap-3"><dt>{t('pricing.factorRawMaterial')}</dt><dd>{formatINR(result.costBreakdown.rawMaterialCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('pricing.factorLabor', { hours: laborFactor.hours, rate: laborFactor.rate })}</dt><dd>{formatINR(result.costBreakdown.laborCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('pricing.factorPackaging')}</dt><dd>{formatINR(result.costBreakdown.packagingCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('pricing.factorTransport')}</dt><dd>{formatINR(result.costBreakdown.transportCost)}</dd></div>
              <div className="flex justify-between gap-3 border-t pt-1 font-semibold"><dt>{t('pricing.baseCost')}</dt><dd>{formatINR(result.costBreakdown.baseCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('pricing.factorTargetMargin', { percent: result.costBreakdown.targetMarginPercent })}</dt><dd>{formatINR(result.costBreakdown.costPlusPrice - result.costBreakdown.baseCost)}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('pricing.costPlus')}</dt><dd>{formatINR(result.costBreakdown.costPlusPrice)}</dd></div>
            </dl>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700">{t('pricing.factors')}</h2>
            <ul className="mt-2 space-y-2">
              {result.factors.map((factor) => (
                <li key={factor.code} className="text-sm text-gray-700">
                  <span>{factorText(factor)}</span>
                  {factorAmount(factor) && <span className="ml-2 text-xs text-gray-500">{factorAmount(factor)}</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700">{t('pricing.comparables')}</h2>
            {result.comparables.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">{t('pricing.comparableEmpty')}</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
                {result.comparables.map((comparable) => (
                  <li key={comparable.id} className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <strong className="text-sm font-medium text-gray-800">{comparable.title}</strong>
                      <p className="text-xs text-gray-500">{[comparable.category, comparable.material, comparable.technique].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="whitespace-nowrap text-sm text-rust">{formatINR(comparable.price)}</span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-3 space-y-1 text-xs text-gray-600">
              <div className="flex justify-between gap-3"><dt>{t('pricing.sampleSize')}</dt><dd>{result.sampleSize > 0 ? t('pricing.sampleSizeValue', { count: result.sampleSize }) : t('pricing.sampleSizeNone')}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('pricing.matchTier')}</dt><dd>{tierLabel(result.matchTier)}</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('pricing.anchorPrice')}</dt><dd>{result.anchorPrice === null ? '—' : formatINR(result.anchorPrice)}</dd></div>
            </dl>
          </div>

          <MarketChannels
            category={form.category}
            material={form.material}
            technique={form.technique}
            price={result.suggestedPrice}
          />

          <div className="bg-white rounded-xl border shadow-sm p-4 lg:col-span-2">
            {result.notes.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-gray-700">{t('pricing.notes')}</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {result.notes.map((note) => (
                    <li key={note.code} className="text-xs text-gray-600">
                      {note.code === 'smallSample'
                        ? t('pricing.noteSmallSample', { count: note.sampleSize })
                        : t(`pricing.${NOTE_KEYS[note.code]}`)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h2 className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-700"><Info size={15} /> {t('pricing.dataSource')}</h2>
            <p className="mt-1 text-xs text-gray-600">{result.dataSource}</p>
            <p className="mt-2 text-xs font-medium text-gray-700">{t('pricing.disclaimer')}</p>
            <p className="mt-1 text-xs text-gray-600">{result.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  )
}


