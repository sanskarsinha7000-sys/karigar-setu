import React, { useMemo, useState } from 'react'
import { ExternalLink, Globe, Mail, Phone, Search, Users } from 'lucide-react'
import Card from '../components/ui/Card'
import ngos from '../data/mockNGOs.json'
import { useTranslation } from '../i18n'

const sections = [
  ['National / Pan-India', 'ngo.regionNational', 'ngo.headingNational'],
  ['North & West India', 'ngo.regionNorthWest', 'ngo.regionNorthWest'],
  ['South, East & North-East India', 'ngo.regionSouthEast', 'ngo.regionSouthEast']
]

function NGOCard({ ngo }) {
  return <Card className="ngo-card"><div className="ngo-card-heading"><h3>{ngo.name}</h3><span>{ngo.state}</span></div><p className="ngo-focus">{ngo.focus}</p><div className="ngo-contact"><a href={`tel:${ngo.phone.replace(/[^+\d]/g, '')}`}><Phone size={14} />{ngo.phone}</a><a href={`mailto:${ngo.email}`}><Mail size={14} />{ngo.email}</a><a href={`https://${ngo.website}`} target="_blank" rel="noreferrer"><Globe size={14} />{ngo.website}<ExternalLink size={12} /></a></div></Card>
}

export default function NGOPartners() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => ngos.filter((ngo) => `${ngo.name} ${ngo.state} ${ngo.focus}`.toLowerCase().includes(search.toLowerCase())), [search])

  return <div className="ngo-page"><header className="ngo-page-header"><div><span className="ngo-kicker">{t('ngo.kickerField')}</span><h1>{t('nav.ngoPartners')}</h1><p>{t('ngo.subtitle')}</p></div><div className="ngo-header-icon"><Users size={30} /></div></header><Card className="ngo-model-card"><div className="ngo-model-icon"><Users size={22} /></div><div><span className="ngo-kicker">{t('ngo.modelKicker')}</span><h2>{t('ngo.modelTitle')}</h2><p>{t('ngo.modelBody')}</p></div></Card><div className="ngo-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('ngo.searchPlaceholder')} aria-label={t('ngo.searchAria')} /></div>{sections.map(([region, regionKey, headingKey]) => { const partners = filtered.filter((ngo) => ngo.region === region); return <section className="ngo-section" key={region}><div className="ngo-section-heading"><div>{regionKey !== headingKey && <span>{t(regionKey)}</span>}<h2>{t(headingKey)}</h2></div><b>{t('ngo.partnersCount', { count: partners.length })}</b></div>{partners.length > 0 ? <div className="ngo-grid">{partners.map((ngo) => <NGOCard key={ngo.id} ngo={ngo} />)}</div> : <p className="ngo-no-results">{t('ngo.noResults')}</p>}</section>})}</div>
}
