import React, { useState } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { useWishlistStore } from '../../store/wishlistStore'
import { useCartStore } from '../../store/cartStore'
import { getProductImage } from '../../lib/productImages'
import { useTranslation } from '../../i18n'

export default function ProductCard({ product }) {
  const { t } = useTranslation()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  // Prefer the product's own persisted image (e.g. product.images[0], a data or http URL);
  // fall back to the existing category visual when there is no usable image.
  const productImage = (Array.isArray(product.images) ? product.images : [])
    .map((src) => (typeof src === 'string' ? src.trim() : ''))
    .find((src) => /^(data:image\/|https?:\/\/|blob:|\/)/i.test(src))
  const imageSrc = productImage || getProductImage(product.category, product.material)
  const isSaved = useWishlistStore((state) => state.items.some((item) => item.id === product.id))
  const toggleWishlist = useWishlistStore((state) => state.toggle)
  const addToCart = useCartStore((state) => state.add)
  return (
    <Card className="product-card flex flex-col gap-3">
      <div className={`product-card-media h-40 rounded-md flex items-center justify-center ${imageFailed ? 'product-image-failed' : ''}`}>{!imageLoaded && !imageFailed && <span className="product-image-skeleton" aria-hidden="true" />} {!imageFailed && <img className={`product-card-image ${imageLoaded ? 'is-loaded' : ''}`} src={imageSrc} alt={t('marketplace.craftAlt', { title: product.title, material: product.material })} onLoad={() => setImageLoaded(true)} onError={() => setImageFailed(true)} />} {imageFailed && <span className="product-image-fallback">{product.category}</span>}<button className={`product-wishlist ${isSaved ? 'is-saved' : ''}`} type="button" onClick={() => toggleWishlist(product)} aria-label={isSaved ? t('wishlist.removeAria', { title: product.title }) : t('wishlist.saveAria', { title: product.title })}><Heart size={17} fill={isSaved ? 'currentColor' : 'none'} /></button></div>
      <div>
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{product.title}</h3>
          <Badge tone={product.status === 'queued' ? 'rust' : product.status === 'syncing' ? 'gold' : 'green'} className="text-xs">{product.status || 'synced'}</Badge>
        </div>
        <p className="text-sm text-gray-600">{product.category} • ₹{product.price}</p><button className="product-add-cart" type="button" onClick={() => addToCart(product)}><ShoppingBag size={14} /> {t('home.addToCart')}</button>
      </div>
    </Card>
  )
}
