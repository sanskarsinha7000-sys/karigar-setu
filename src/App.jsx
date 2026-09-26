import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import AIScanner from './pages/AIScanner'
import SmartCatalog from './pages/SmartCatalog'
import ImageStudio from './pages/ImageStudio'
import AutoCataloger from './pages/AutoCataloger'
import DynamicPricing from './pages/DynamicPricing'
import Layout from './components/layout/Layout'
import { useTranslation } from './i18n'

// Route-level code splitting. The flagship/demo routes above stay eager so they render on the
// first paint; these secondary pages are fetched on demand. BuyerMarketplace in particular pulls
// in the whole three.js / @react-three 3D stack and Analytics pulls in recharts, so keeping them
// out of the initial import graph is what removes those libraries from the first download.
// Route paths, layout, navigation and the catch-all redirect are unchanged.
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Login = lazy(() => import('./pages/Login'))
const OperatorDashboard = lazy(() => import('./pages/OperatorDashboard'))
const BuyerMarketplace = lazy(() => import('./pages/BuyerMarketplace'))
// Marketplace is the selling-advice page ("where should I sell this?"), not the product grid.
// It reuses the existing market-recommendation engine via components/shared/MarketChannels.
// BuyerMarketplace stays as the /shop shopping experience and is unchanged.
const MarketplaceAdvisor = lazy(() => import('./pages/MarketplaceAdvisor'))
const AddArtisan = lazy(() => import('./pages/AddArtisan'))
const ProductUpload = lazy(() => import('./pages/ProductUpload'))
const Inquiries = lazy(() => import('./pages/Inquiries'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Assistant = lazy(() => import('./pages/Assistant'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Cart = lazy(() => import('./pages/Cart'))
const PublicPage = lazy(() => import('./pages/PublicPage'))
const NGOPartners = lazy(() => import('./pages/NGOPartners'))

export default function App() {
  const { t } = useTranslation()
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">{t('common.loading')}</div>}>
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<OperatorDashboard />} />
      </Route>
      <Route path="/assistant" element={<Layout />}><Route index element={<Assistant />} /></Route>
      <Route path="/shop" element={<Layout />}><Route index element={<BuyerMarketplace />} /></Route>
      <Route path="/wishlist" element={<Layout />}><Route index element={<Wishlist />} /></Route>
      <Route path="/cart" element={<Layout />}><Route index element={<Cart />} /></Route>
      <Route path="/operator/add-artisan" element={<Layout />}><Route index element={<AddArtisan />} /></Route>
      <Route path="/operator/upload" element={<Layout />}><Route index element={<ProductUpload />} /></Route>
      <Route path="/scanner" element={<Layout />}><Route index element={<AIScanner />} /></Route>
      <Route path="/catalog" element={<Layout />}><Route index element={<SmartCatalog />} /></Route>
      <Route path="/marketplace" element={<Layout />}><Route index element={<MarketplaceAdvisor />} /></Route>
      <Route path="/inquiries" element={<Layout />}><Route index element={<Inquiries />} /></Route>
      <Route path="/analytics" element={<Layout />}><Route index element={<Analytics />} /></Route>
      <Route path="/ngo-partners" element={<Layout />}><Route index element={<NGOPartners />} /></Route>
      <Route path="/image-studio" element={<Layout />}><Route index element={<ImageStudio />} /></Route>
      <Route path="/auto-cataloger" element={<Layout />}><Route index element={<AutoCataloger />} /></Route>
      <Route path="/dynamic-pricing" element={<Layout />}><Route index element={<DynamicPricing />} /></Route>
      <Route path="/artisans" element={<PublicPage />} />
      <Route path="/categories" element={<PublicPage />} />
      <Route path="/about" element={<PublicPage />} />
      <Route path="/contact" element={<PublicPage />} />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
    </Suspense>
  )
}
