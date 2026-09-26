import React from 'react'
import { useArtisanStore } from '../store/artisanStore'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, MessageCircle, Plus, ShoppingBag, Users, Eye, ArrowUpRight } from 'lucide-react'
import { useTranslation } from '../i18n'

const avatarPalettes = [
  ['#7A3F25', '#2F6A4A', '#E8A15D'], ['#8C542F', '#C98245', '#F0C28A'], ['#6B3929', '#D58A16', '#E5A65A'],
  ['#7B4028', '#3C3028', '#D99455'], ['#5B3026', '#7651A8', '#D99A64'], ['#42251D', '#416D85', '#B86B3E'],
  ['#6E3827', '#3A2B27', '#DC8B4D'], ['#73452F', '#2F7A5B', '#E0A268'], ['#8A4D2F', '#D68A22', '#C77942'],
  ['#613225', '#352B2A', '#DC8C51'], ['#6A3523', '#9C2D25', '#D27E42'], ['#7B4228', '#392A27', '#D28C52']
]

function ArtisanAvatar({ index }) {
  const [skin, hair, shirt] = avatarPalettes[index % avatarPalettes.length]
  const isTurban = index === 1 || index === 5 || index === 8 || index === 10
  const isScarf = index === 2 || index === 4 || index === 6 || index === 9
  return (
    <svg className="dashboard-avatar" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill={index % 2 ? '#F5E9D8' : '#E8EFE1'} />
      <path d="M15 62c2-13 10-19 17-19s15 6 17 19" fill={shirt} />
      {isTurban && <path d="M18 23c1-11 25-16 30-1-4-3-8-3-13-1-5-3-11 1-17 2Z" fill={hair} />}
      {isScarf && <path d="M16 27c1 14 5 24 16 29 11-5 16-15 16-29-5 4-10 6-16 6s-11-2-16-6Z" fill={hair} opacity=".95" />}
      <ellipse cx="32" cy="31" rx="13" ry="16" fill={skin} />
      <path d={isTurban ? 'M20 24c3-10 21-12 25-1-8-2-16-1-25 1Z' : 'M20 25c1-12 22-16 26-1-7-4-17-4-26 1Z'} fill={hair} />
      <circle cx="27" cy="32" r="1.4" fill="#3D2922" /><circle cx="37" cy="32" r="1.4" fill="#3D2922" />
      <path d="M28 39c3 2 5 2 8 0" fill="none" stroke="#713E2C" strokeWidth="1.5" strokeLinecap="round" />
      {isScarf && <path d="M18 25c3 5 8 8 14 8 6 0 11-3 14-8" fill="none" stroke={hair} strokeWidth="4" />}
    </svg>
  )
}

function SidebarStillLife() {
  return (
    <svg className="dashboard-still-life dashboard-still-life-sidebar" viewBox="0 0 220 170" aria-hidden="true">
      <ellipse cx="111" cy="149" rx="92" ry="12" fill="#B98559" opacity=".18" />
      <path d="M25 132c32-17 119-16 169 2l-7 14H34Z" fill="#C99A67" opacity=".65" />
      <path d="m36 135 151 7M47 130l126 16M74 128l-4 19M115 127l-1 19M154 130l-3 15" stroke="#9C6B45" opacity=".5" />
      <path d="M39 122c1-27 3-48 18-50 14 2 16 21 15 50-7 9-25 9-33 0Z" fill="url(#potA)" />
      <path d="M42 75c3-7 28-7 32 0v7c-8 5-24 5-32 0Z" fill="#C86D35" /><ellipse cx="58" cy="75" rx="16" ry="4" fill="#E29A5E" />
      <path d="M113 135c-2-37-1-68 12-75 14 7 17 40 14 75-6 8-19 8-26 0Z" fill="url(#potB)" /><ellipse cx="126" cy="61" rx="14" ry="4" fill="#D68A4A" />
      <path d="M126 60c-2-30-2-47-11-57M127 60c5-30 13-40 23-50M126 50c-13-13-22-16-32-15M130 43c12-11 22-13 31-10" fill="none" stroke="#718044" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 143c-8-21-2-34 14-34 17 0 19 17 12 34Z" fill="#F0E7D7" /><ellipse cx="106" cy="109" rx="12" ry="4" fill="#D8C9B5" />
      <defs><linearGradient id="potA" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#EEA467" /><stop offset="1" stopColor="#9B4A29" /></linearGradient><linearGradient id="potB" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#E4A067" /><stop offset="1" stopColor="#A4562E" /></linearGradient></defs>
    </svg>
  )
}

function LoomAccent() {
  return (
    <svg className="dashboard-loom" viewBox="0 0 245 150" aria-hidden="true">
      <ellipse cx="126" cy="132" rx="100" ry="11" fill="#A76A3C" opacity=".17" />
      <path d="M55 25h113M67 23l-12 103M157 23l14 103M55 126h118" fill="none" stroke="#B97642" strokeWidth="7" strokeLinecap="round" />
      <path d="M82 45h74v72H82Z" fill="#EEE4D4" opacity=".9" />
      <path d="M82 48h74M88 51v62M98 51v62M108 51v62M118 51v62M128 51v62M138 51v62M148 51v62" stroke="#D9B993" strokeWidth="2" />
      <path d="M82 55c16 16 30-9 44 6 10 11 17 5 30-3v23c-14 8-19 14-31 2-13-13-26 11-43-5Z" fill="#A9C4C5" opacity=".95" />
      <path d="M190 120c0-23 2-37 13-38 12 1 15 16 13 38-5 6-20 6-26 0Z" fill="url(#loomPot)" /><ellipse cx="203" cy="82" rx="12" ry="4" fill="#D88A52" />
      <defs><linearGradient id="loomPot" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#E5A06A" /><stop offset="1" stopColor="#A6512E" /></linearGradient></defs>
    </svg>
  )
}

export default function OperatorDashboard(){
  const artisans = useArtisanStore(s=>s.artisans)
  const { t } = useTranslation()
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div><h1 className="text-2xl font-heading text-rust">{t('dashboard.title')}</h1><p className="dashboard-subtitle">{t('dashboard.subtitle')}</p></div>
        <button className="dashboard-profile" type="button" aria-label={t('dashboard.profileAria')}>
          <span className="dashboard-profile-avatar">👨🏽</span><span className="dashboard-profile-copy"><strong>Operator</strong><small>Admin</small></span><ChevronDown size={18} />
        </button>
      </header>
      <LoomAccent />
      <div className="dashboard-stats">
        <div className="dashboard-stat"><span className="dashboard-stat-icon stat-orange"><Users size={25} /></span><div><h3>{t('dashboard.managedArtisans')}</h3><p>{artisans.length}</p><small>{t('dashboard.totalRegistered')}</small></div></div>
        <div className="dashboard-stat"><span className="dashboard-stat-icon stat-green"><ShoppingBag size={25} /></span><div><h3>{t('dashboard.activeListings')}</h3><p>25</p><small>{t('dashboard.currentlyActive')}</small></div></div>
        <div className="dashboard-stat"><span className="dashboard-stat-icon stat-purple"><MessageCircle size={25} /></span><div><h3>{t('dashboard.pendingInquiries')}</h3><p>10</p><small>{t('dashboard.needsResponse')}</small></div></div>
        <div className="dashboard-stat"><span className="dashboard-stat-icon stat-blue"><Eye size={25} /></span><div><h3>{t('dashboard.profileViews')}</h3><p>1,234</p><small>{t('dashboard.acrossAllArtisans')}</small></div></div>
      </div>
      <div className="dashboard-artisans">
        <h2 className="text-lg">{t('nav.artisans')}</h2>
        <div className="dashboard-artisan-grid">
          {artisans.map((a, index)=> (
            <div key={a.id} className="dashboard-artisan-card">
              <ArtisanAvatar index={index} /><div><h3>{a.name}</h3><p>{a.village} • {a.craft}</p></div><span className="dashboard-verified" title={t('dashboard.verifiedArtisan')}><Check size={12} /></span>
            </div>
          ))}
        </div>
      </div>
      <div className="dashboard-add-wrap"><Link to="/operator/add-artisan" className="dashboard-add"><Plus size={19} /> {t('nav.addArtisan')}</Link></div>
      <section className="dashboard-overview">
        <div className="dashboard-panel dashboard-inquiries"><div className="dashboard-panel-heading"><div><span>{t('dashboard.inbox')}</span><h2>{t('dashboard.recentInquiries')}</h2></div><ArrowUpRight size={17} /></div>{['Handwoven runners for boutique hotel', 'Bulk terracotta planters', 'Custom brass pendant collection'].map((item, index) => <div className="dashboard-inquiry" key={item}><span className={`inquiry-dot inquiry-${index}`} /><div><strong>{item}</strong><small>{['Maya Home Studio', 'The Green Room', 'Asha Collective'][index]} · {index + 1}h ago</small></div><b>{index === 0 ? t('dashboard.statusNew') : t('dashboard.statusOpen')}</b></div>)}</div>
        <div className="dashboard-panel"><div className="dashboard-panel-heading"><div><span>{t('dashboard.performance')}</span><h2>{t('dashboard.listingsOverview')}</h2></div><small>{t('dashboard.last7Days')}</small></div><div className="dashboard-chart"><div className="chart-y"><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="chart-bars">{[42, 62, 51, 78, 59, 88, 72].map((height, index) => <i style={{height: `${height}%`}} key={index}><b /></i>)}</div></div><div className="chart-labels"><span>{t('dashboard.weekMon')}</span><span>{t('dashboard.weekTue')}</span><span>{t('dashboard.weekWed')}</span><span>{t('dashboard.weekThu')}</span><span>{t('dashboard.weekFri')}</span><span>{t('dashboard.weekSat')}</span><span>{t('dashboard.weekSun')}</span></div></div>
        <div className="dashboard-panel"><div className="dashboard-panel-heading"><div><span>{t('dashboard.community')}</span><h2>{t('dashboard.topArtisans')}</h2></div><ArrowUpRight size={17} /></div>{artisans.slice(0, 3).map((artisan, index) => <div className="dashboard-top-artisan" key={artisan.id}><ArtisanAvatar index={index} /><div><strong>{artisan.name}</strong><small>{artisan.craft}</small></div><b>{[98, 91, 87][index]}%</b></div>)}</div>
        <div className="dashboard-panel"><div className="dashboard-panel-heading"><div><span>{t('dashboard.today')}</span><h2>{t('dashboard.recentActivityHeading')}</h2></div></div><div className="dashboard-activity"><span /><p><strong>{t('dashboard.activityNewArtisan')}</strong><small>{t('dashboard.activityJoined', { name: 'Kamla Devi' })}</small></p><time>09:42</time></div><div className="dashboard-activity"><span /><p><strong>{t('dashboard.activityListingApproved')}</strong><small>{t('dashboard.activityListingLive', { name: 'Mohanpur Ikat Throw' })}</small></p><time>08:16</time></div><div className="dashboard-activity"><span /><p><strong>{t('dashboard.activityInquiryResponded')}</strong><small>{t('dashboard.activityReplied', { name: 'Rukmini' })}</small></p><time>07:50</time></div></div>
      </section>
      <SidebarStillLife />
    </div>
  )
}
