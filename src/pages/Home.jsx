import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight, Heart, Menu, Search, ShoppingBag, Truck, Users, ShieldCheck, User, X, Trash2, Minus, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import artisans from '../data/mockArtisans.json'
import BrandLogo from '../components/shared/BrandLogo'
import { useProductStore } from '../store/productStore'
import { useWishlistStore } from '../store/wishlistStore'
import { useCartStore } from '../store/cartStore'
import { useTranslation } from '../i18n'
import LanguageSelector from '../components/shared/LanguageSelector'
import Sidebar from '../components/layout/Sidebar'

const categories = [
  { name: 'Pottery', note: 'Earth, shaped by hand', type: 'pottery', color: 'clay' },
  { name: 'Textiles', note: 'Threads with a story', type: 'textile', color: 'sage' },
  { name: 'Jewelry', note: 'Small pieces, big soul', type: 'jewelry', color: 'blush' },
  { name: 'Home Decor', note: 'Warmth for every corner', type: 'decor', color: 'ochre' },
  { name: 'Woodcraft', note: 'Carved from the grain', type: 'wood', color: 'indigo' },
  { name: 'Gift Items', note: 'Made to be remembered', type: 'gift', color: 'mint' }
]

function ProductIllustration({ type, large = false }) {
  return <div className={`product-illustration product-${type} ${large ? 'product-illustration-large' : ''}`} aria-hidden="true"><span className="product-shadow" /><span className="product-shape product-shape-one" /><span className="product-shape product-shape-two" /><span className="product-detail" /></div>
}

export function Navbar() {
  const { t } = useTranslation()
  const links = [[t('nav.home'), '/'], [t('nav.shop'), '/shop'], [t('nav.artisans'), '/artisans'], [t('nav.categories'), '/categories'], [t('nav.aboutUs'), '/about'], [t('nav.contact'), '/contact']]
  const navigate = useNavigate()
  const products = useProductStore((state) => state.products)
  const wishlistCount = useWishlistStore((state) => state.items.length)
  const cartItems = useCartStore((state) => state.items)
  const removeFromCart = useCartStore((state) => state.remove)
  const decrementCart = useCartStore((state) => state.decrement)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const searchRef = useRef(null)
  const searchResults = search.trim() ? products.filter((product) => `${product.title} ${product.category} ${product.material}`.toLowerCase().includes(search.toLowerCase())).slice(0, 4) : []
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)

  useEffect(() => { if (searchOpen) searchRef.current?.focus() }, [searchOpen])
  const submitSearch = (event) => { event.preventDefault(); if (search.trim()) navigate(`/marketplace?query=${encodeURIComponent(search.trim())}`) }

  return <>
    <header className="home-navbar"><BrandLogo className="navbar-brand" /><nav className="home-nav">{links.map(([label, to]) => <Link key={to} className={to === '/' ? 'active' : ''} to={to}>{label}</Link>)}</nav><div className="home-actions"><button className={`navbar-icon-button ${searchOpen ? 'is-active' : ''}`} aria-label={t('homeNav.searchAria')} onClick={() => setSearchOpen((open) => !open)}><Search size={17} /></button><button className="navbar-icon-button home-wishlist" aria-label={t('homeNav.wishlistAria')} onClick={() => navigate('/wishlist')}><Heart size={17} fill={wishlistCount ? 'currentColor' : 'none'} />{wishlistCount > 0 && <b>{wishlistCount}</b>}</button><button className="navbar-icon-button home-cart" aria-label={t('homeNav.cartAria')} onClick={() => setCartOpen(true)}><ShoppingBag size={17} />{cartItems.length > 0 && <b>{cartItems.length}</b>}</button><LanguageSelector className="hidden md:block" /><Link className="home-login" to="/login">{t('nav.loginRegister')}</Link><button className="home-menu" aria-label={t('homeNav.openMenuAria')} onClick={() => setNavOpen(true)}><Menu size={20} /></button></div></header>
    <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
    {navOpen && <div className="app-nav-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}
    {searchOpen && <div className="navbar-search-popover"><form onSubmit={submitSearch}><Search size={16} /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('homeNav.searchPlaceholder')} aria-label={t('homeNav.searchAria')} /><button type="button" onClick={() => { setSearch(''); setSearchOpen(false) }} aria-label={t('homeNav.closeSearchAria')}><X size={16} /></button></form>{searchResults.length > 0 && <div className="navbar-search-results">{searchResults.map((product) => <button type="button" key={product.id} onClick={() => navigate(`/marketplace?query=${encodeURIComponent(product.title)}`)}><span>{product.title}</span><small>{product.category} · ₹{product.price}</small></button>)}</div>}{search.trim() && searchResults.length === 0 && <p className="navbar-no-results">{t('homeNav.noResults')}</p>}</div>}
    {cartOpen && <div className="cart-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()}><div className="cart-drawer-header"><div><span>{t('homeNav.yourSelection')}</span><h2>{t('homeNav.shoppingCart')}</h2></div><button type="button" onClick={() => setCartOpen(false)} aria-label={t('homeNav.closeCartAria')}><X size={19} /></button></div>{cartItems.length === 0 ? <div className="cart-empty"><ShoppingBag size={28} /><p>{t('homeNav.cartEmpty')}</p><Link to="/shop" onClick={() => setCartOpen(false)}>{t('homeNav.exploreMarketplace')}</Link></div> : <><div className="cart-items">{cartItems.map((item) => <div className="cart-item" key={item.id}><div className="cart-item-thumb">{item.material}</div><div className="cart-item-copy"><strong>{item.title}</strong><small>₹{item.price}</small><div><button type="button" onClick={() => decrementCart(item.id)} aria-label="Decrease quantity"><Minus size={12} /></button><span>{item.qty}</span><button type="button" onClick={() => useCartStore.getState().add(item)} aria-label="Increase quantity"><Plus size={12} /></button><button className="cart-remove" type="button" onClick={() => removeFromCart(item.id)} aria-label={t('homeNav.removeAria', { title: item.title })}><Trash2 size={14} /></button></div></div></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div><button type="button" onClick={() => { setCartOpen(false); navigate('/cart') }}>{t('homeNav.checkout')} <ArrowRight size={15} /></button></div></>}</aside></div>}
  </>
}

function HeroScene() {
  return <div className="hero-scene" aria-label="Collection of handmade Indian crafts"><div className="hero-glow" /><div className="hero-metric"><strong>10,000+</strong><span>Artisans Empowered</span></div><div className="hero-plant"><i /><i /><i /><span /></div><div className="hero-basket"><span /><span /><span /></div><div className="hero-cloth">S</div><div className="hero-pot hero-pot-tall"><em>✿</em></div><div className="hero-pot hero-pot-small"><em>✿</em></div><div className="hero-box"><span>✦</span></div><div className="hero-brass"><span /></div><div className="hero-mat" /></div>
}

function TrustFeatures() {
  const items = [[ShieldCheck, 'Authentic Handicrafts', '100% Genuine Products', 'peach'], [Users, 'Support Artisans', 'Sustainable Livelihoods', 'green'], [ShoppingBag, 'Secure Payments', 'Safe & Trusted', 'blue'], [Truck, 'Pan India Delivery', 'Fast & Reliable', 'purple']]
  return <div className="trust-bar">{items.map(([Icon, title, copy, tone]) => <div className="trust-item" key={title}><span className={`trust-icon ${tone}`}><Icon size={17} /></span><span><strong>{title}</strong><small>{copy}</small></span></div>)}</div>
}

function CategoryCard({ category }) {
  return <Link to="/shop" className="category-card"><div className={`category-art ${category.color}`}><ProductIllustration type={category.type} /></div><div><strong>{category.name}</strong><small>{category.note}</small></div><ArrowRight size={17} /></Link>
}

function ArtisanCard({ artisan, index }) {
  return <Link to="/artisans" className="featured-artisan"><div className={`artisan-portrait portrait-${index}`}><span>{artisan.name.charAt(0)}</span></div><div><strong>{artisan.name}</strong><small>{artisan.village} <b>•</b> {artisan.craft}</small><span className="artisan-link">View profile <ArrowRight size={13} /></span></div></Link>
}

export function Footer() {
  return <footer className="home-footer"><div className="footer-brand"><BrandLogo footer /><p>Connecting hands, heritage, and hearts<br />across India.</p></div><div className="footer-links"><strong>Explore</strong><Link to="/shop">Shop</Link><Link to="/artisans">Artisans</Link><Link to="/categories">Categories</Link></div><div className="footer-links"><strong>About</strong><Link to="/about">Our story</Link><Link to="/contact">Contact</Link><Link to="/login">Account</Link></div><div className="footer-social"><strong>Stay connected</strong><p>Stories from the hands that make.</p><span><a href="#instagram" aria-label="Instagram">IG</a><a href="#facebook" aria-label="Facebook">f</a><a href="#youtube" aria-label="Youtube">YT</a></span></div><div className="footer-bottom">© 2026 Karigar Setu <span>Made with care for craft communities</span></div></footer>
}

export default function Home() {
  return <div className="home-page"><Navbar /><main><section className="home-hero"><div className="hero-copy"><span className="eyebrow">✦ Empowering Artisans, Enriching Lives</span><h1>Bridging Traditions,<br />Connecting <i>Artisans</i></h1><p>Discover handcrafted products made by skilled artisans across India. Support local. Buy global.</p><div className="hero-buttons"><Link className="button-primary" to="/shop">Shop Now <ArrowRight size={15} /></Link><Link className="button-secondary" to="/artisans"><User size={15} /> Meet Artisans</Link></div><div className="hero-note"><span>✦</span> Every purchase preserves a tradition</div></div><HeroScene /></section><TrustFeatures /><section className="home-section categories-section"><div className="section-heading"><div><span className="section-kicker">Curated for your home</span><h2>Shop by category</h2></div><Link to="/categories">View all categories <ArrowRight size={15} /></Link></div><div className="category-grid">{categories.map(category => <CategoryCard key={category.name} category={category} />)}</div></section><section className="home-section artisans-section"><div className="section-heading"><div><span className="section-kicker">The hands behind the craft</span><h2>Featured artisans</h2></div><Link to="/artisans">Meet all artisans <ArrowRight size={15} /></Link></div><div className="artisan-grid">{artisans.slice(0, 4).map((artisan, index) => <ArtisanCard key={artisan.id} artisan={artisan} index={index} />)}</div></section><section className="story-cta"><div><span className="section-kicker">A little more human</span><h2>Every Craft<br /><i>Has a Story.</i></h2><p>Discover the people and traditions behind India's finest handmade products.</p><Link className="button-primary" to="/artisans">Meet Our Artisans <ArrowRight size={15} /></Link></div><div className="cta-stamp">HAND<br /><b>MADE</b><br />IN INDIA</div></section></main><Footer /></div>
}
