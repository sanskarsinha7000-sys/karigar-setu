import React from 'react'
import ProductCard from '../components/shared/ProductCard'
import { useProductStore } from '../store/productStore'
import HeroCraftScene from '../components/three/HeroCraftScene'
import { useInquiryStore } from '../store/inquiryStore'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from '../i18n'


export default function BuyerMarketplace(){
  const products = useProductStore(s=>s.products)
  const addInquiry = useInquiryStore(s=>s.addInquiry)
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('query') || ''
  const filteredProducts = products.filter((product) => `${product.title} ${product.category} ${product.material}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <div className="marketplace-hero h-[320px] w-full bg-white rounded-md p-4 mb-6"><HeroCraftScene /></div>
      <h2 className="text-xl font-heading text-rust">{query ? t('marketplace.searchResults', { query }) : t('marketplace.featured')}</h2>
      <div className="mt-4 grid grid-cols-4 gap-4">
        {filteredProducts.slice(0,8).map(p=> (
          <div key={p.id}>
            <ProductCard product={p} />
            <div className="mt-2 flex gap-2"><button className="px-3 py-1 text-sm border rounded-md" onClick={()=>addInquiry(p.id, 'Demo Buyer', t('marketplace.inquiryMessage'))}>{t('marketplace.inquire')}</button></div>
          </div>
        ))}
      </div>
      {filteredProducts.length === 0 && <p className="mt-4 text-gray-600">{t('marketplace.noResults')}</p>}
    </div>
  )
}
