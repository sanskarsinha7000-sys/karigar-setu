import React from 'react'
import { Heart, ShoppingBag, Trash2 } from 'lucide-react'
import { useWishlistStore } from '../store/wishlistStore'
import { useCartStore } from '../store/cartStore'
import Card from '../components/ui/Card'
import { useTranslation } from '../i18n'

export default function Wishlist() {
  const { t } = useTranslation()
  const items = useWishlistStore((state) => state.items)
  const remove = useWishlistStore((state) => state.remove)
  const addToCart = useCartStore((state) => state.add)

  return <div className="wishlist-page"><div className="wishlist-heading"><div><span>{t('wishlist.savedForLater')}</span><h1>{t('wishlist.title')}</h1><p>{t('wishlist.subtitle')}</p></div><Heart size={32} /></div>{items.length === 0 ? <Card className="wishlist-empty"><Heart size={28} /><h2>{t('wishlist.emptyTitle')}</h2><p>{t('wishlist.emptyHint')}</p></Card> : <div className="wishlist-grid">{items.map((product) => <Card key={product.id} className="wishlist-item"><div className="wishlist-thumb">{product.material}</div><div className="wishlist-item-copy"><h2>{product.title}</h2><p>{product.category} · ₹{product.price}</p><div><button type="button" onClick={() => addToCart(product)}><ShoppingBag size={15} /> {t('home.addToCart')}</button><button type="button" onClick={() => remove(product.id)} aria-label={t('homeNav.removeAria', { title: product.title })}><Trash2 size={15} /></button></div></div></Card>)}</div>}</div>
}
