import React from 'react'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import Card from '../components/ui/Card'
import { useTranslation } from '../i18n'

export default function Cart() {
  const { t } = useTranslation()
  const items = useCartStore((state) => state.items)
  const add = useCartStore((state) => state.add)
  const decrement = useCartStore((state) => state.decrement)
  const remove = useCartStore((state) => state.remove)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  return <div className="cart-page"><span className="section-kicker">{t('homeNav.yourSelection')}</span><h1 className="text-2xl font-heading text-rust mt-1">{t('homeNav.shoppingCart')}</h1>{items.length === 0 ? <Card className="cart-page-empty"><ShoppingBag size={30} /><h2>{t('cart.emptyTitle')}</h2><p>{t('cart.emptyHint')}</p></Card> : <div className="cart-page-layout"><div>{items.map((item) => <Card key={item.id} className="cart-page-item"><div className="cart-item-thumb">{item.material}</div><div className="cart-item-copy"><strong>{item.title}</strong><small>{item.category} · ₹{item.price}</small><div className="cart-quantity"><button type="button" onClick={() => decrement(item.id)} aria-label={t('cart.decreaseQuantity')}><Minus size={13} /></button><span>{item.qty}</span><button type="button" onClick={() => add(item)} aria-label={t('cart.increaseQuantity')}><Plus size={13} /></button></div></div><button className="cart-page-remove" type="button" onClick={() => remove(item.id)} aria-label={t('homeNav.removeAria', { title: item.title })}><Trash2 size={16} /></button></Card>)}</div><Card className="cart-page-summary"><span>{t('cart.orderSummary')}</span><h2>{t('cart.summaryTitle')}</h2><div><span>{t('cart.subtotal')}</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div><button type="button" disabled aria-describedby="cart-checkout-note" className="disabled:cursor-not-allowed disabled:opacity-60">{t('homeNav.checkout')} <ArrowRight size={16} /></button><p id="cart-checkout-note" className="mt-2 text-xs text-gray-500">{t('cart.checkoutUnavailable')}</p></Card></div>}</div>
}
