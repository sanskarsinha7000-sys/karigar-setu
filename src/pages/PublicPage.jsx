import React, { useState } from 'react'
import { ArrowRight, CheckCircle2, Mail, MapPin, Phone, Send, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import artisans from '../data/mockArtisans.json'
import { Footer, Navbar } from './Home'

const categoryDetails = [
  ['Pottery', 'Warm earthware shaped on the wheel', 'clay'],
  ['Textiles', 'Handloom stories woven thread by thread', 'sage'],
  ['Jewelry', 'Small-batch brass, lac, and silver work', 'blush'],
  ['Home Decor', 'Pieces that make everyday spaces feel lived in', 'ochre'],
  ['Woodcraft', 'Patient carving from India’s finest grains', 'indigo'],
  ['Gift Items', 'Thoughtful objects with a human touch', 'mint']
]

function PageIntro({ eyebrow, title, copy }) {
  return <div className="public-page-intro"><span>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>
}

function ArtisansPage() {
  return <><PageIntro eyebrow="The hands behind the craft" title="Meet our artisans" copy="Every piece begins with a person, a place, and a tradition worth carrying forward." /><div className="public-artisan-grid">{artisans.map((artisan, index) => <Link to="/shop" className="public-artisan-card" key={artisan.id}><div className={`public-artisan-portrait portrait-${index % 4}`}><span>{artisan.name.charAt(0)}</span></div><div><h2>{artisan.name}</h2><p>{artisan.village} <b>•</b> {artisan.craft}</p><small>{artisan.affiliation}</small><span>Explore their craft <ArrowRight size={14} /></span></div></Link>)}</div></>
}

function CategoriesPage() {
  return <><PageIntro eyebrow="Made for meaningful spaces" title="Find your kind of craft" copy="Browse collections shaped by regional materials, techniques, and the people who keep them alive." /><div className="public-category-grid">{categoryDetails.map(([name, copy, tone]) => <Link to={`/marketplace?query=${encodeURIComponent(name)}`} className={`public-category-card ${tone}`} key={name}><div className="public-category-art"><Sparkles size={24} /></div><div><h2>{name}</h2><p>{copy}</p><span>Explore collection <ArrowRight size={14} /></span></div></Link>)}</div></>
}

function AboutPage() {
  return <><PageIntro eyebrow="Our purpose" title="Technology that keeps craft human" copy="Karigar Setu connects India's skilled artisan communities with thoughtful buyers, without losing the story behind the object." /><div className="public-about-grid"><article><span className="public-number">01</span><h2>Discover with context</h2><p>Each listing brings the maker, village, material, and technique closer to the buying experience.</p></article><article><span className="public-number">02</span><h2>Price with dignity</h2><p>Our tools help operators create transparent pricing that respects labor, material, and sustainable margins.</p></article><article><span className="public-number">03</span><h2>Grow together</h2><p>Better discovery and clearer buyer conversations create steady opportunities for artisan collectives.</p></article></div><div className="public-about-quote"><strong>“</strong><p>When a craft finds the right home, a tradition gets another chapter.</p><small>Karigar Setu · Artisan Bridge</small></div></>
}

function ContactPage() {
  const [sent, setSent] = useState(false)
  return <><PageIntro eyebrow="We would love to hear from you" title="Let’s make a connection" copy="Have a question about a craft, an artisan story, or bringing your collection to Karigar Setu? Reach out." /><div className="public-contact-grid"><div className="public-contact-details"><div><Mail size={18} /><span><strong>Email us</strong><small>hello@karigarsetu.in</small></span></div><div><Phone size={18} /><span><strong>Call our bridge team</strong><small>+91 80 4567 8900</small></span></div><div><MapPin size={18} /><span><strong>Our home base</strong><small>Bengaluru · India</small></span></div></div><form className="public-contact-form" onSubmit={(event) => { event.preventDefault(); setSent(true) }}>{sent ? <div className="public-contact-success"><CheckCircle2 size={28} /><h2>Message received</h2><p>We’ll be in touch soon. Thank you for helping craft travel further.</p></div> : <><label>Name<input required placeholder="Your name" /></label><label>Email<input required type="email" placeholder="you@example.com" /></label><label>Message<textarea required rows="4" placeholder="How can we help?" /></label><button type="submit">Send message <Send size={15} /></button></>}</form></div></>
}

export default function PublicPage() {
  const { pathname } = useLocation()
  const content = pathname === '/artisans' ? <ArtisansPage /> : pathname === '/categories' ? <CategoriesPage /> : pathname === '/about' ? <AboutPage /> : <ContactPage />
  return <div className="public-page"><Navbar /><main className="public-page-main">{content}</main><Footer /></div>
}
