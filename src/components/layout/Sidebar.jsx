import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, User, Archive, ShoppingCart, MessageCircle, PieChart, Settings, Bot, Users, X, Wand2, Languages, IndianRupee, ScanLine, FileText } from 'lucide-react'
import BrandLogo from '../shared/BrandLogo'
import LanguageSelector from '../shared/LanguageSelector'
import { useTranslation } from '../../i18n'

export default function Sidebar({ open = true, onClose }) {
  const { t } = useTranslation()
  const items = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: Home },
    { to: '/operator/add-artisan', label: t('nav.addArtisan'), icon: User },
    { to: '/operator/upload', label: t('nav.uploadProduct'), icon: Archive },
    { to: '/scanner', label: t('scanner.title'), icon: ScanLine },
    { to: '/image-studio', label: t('nav.imageStudio'), icon: Wand2 },
    { to: '/auto-cataloger', label: t('nav.autoCataloger'), icon: Languages },
    { to: '/catalog', label: t('catalog.title'), icon: FileText },
    { to: '/dynamic-pricing', label: t('nav.dynamicPricing'), icon: IndianRupee },
    { to: '/marketplace', label: t('nav.marketplace'), icon: ShoppingCart },
    { to: '/inquiries', label: t('nav.inquiries'), icon: MessageCircle },
    { to: '/assistant', label: t('nav.aiAssistant'), icon: Bot },
    { to: '/analytics', label: t('nav.analytics'), icon: PieChart },
    { to: '/ngo-partners', label: t('nav.ngoPartners'), icon: Users },
    { to: '/analytics', label: t('nav.settings'), icon: Settings }
  ]

  return (
    <aside className={`w-64 bg-sand p-4 border-r border-transparent app-nav-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      {onClose && <button className="app-nav-close" type="button" onClick={onClose} aria-label="Close navigation"><X size={18} /></button>}
      <div className="mb-6 sidebar-brand"><BrandLogo /></div>
      <div className="mb-4"><LanguageSelector /></div>
      <nav className="space-y-2">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} className={({isActive}) => `flex items-center gap-3 p-2 rounded-md ${isActive ? 'bg-terracotta/10 text-rust' : 'text-gray-700 hover:bg-gray-50'}`}>
            <it.icon size={16} /> {it.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
