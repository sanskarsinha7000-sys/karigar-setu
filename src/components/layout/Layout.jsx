import React, { useEffect, useState } from 'react'
import { Menu, MessageCircle, X } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import PageTransition from '../ui/PageTransition'
import ChatWindow from '../shared/ChatWindow'

export default function Layout() {
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const isAssistantPage = location.pathname === '/assistant'

  // Keep the navigation drawer closed after any route change.
  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  // Escape closes the navigation drawer.
  useEffect(() => {
    if (!navOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  return (
    <div className="min-h-screen flex grain">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="app-nav-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      {!navOpen && <button className="app-nav-toggle" type="button" onClick={() => setNavOpen(true)} aria-label="Open navigation" aria-expanded={navOpen}><Menu size={20} /></button>}
      <main className="flex-1 p-6">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      {!isAssistantPage && <>
        {assistantOpen && <ChatWindow onClose={() => setAssistantOpen(false)} />}
        <button className={`assistant-launcher ${assistantOpen ? 'is-open' : ''}`} type="button" onClick={() => setAssistantOpen((open) => !open)} aria-label={assistantOpen ? 'Close AI Assistant' : 'Open AI Assistant'}>{assistantOpen ? <X size={20} /> : <MessageCircle size={21} />}<span>AI Assistant</span></button>
      </>}
    </div>
  )
}
