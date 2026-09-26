import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import symbolUrl from './assets/karigar-setu-symbol.png'
import { useAuthStore } from './store/authStore'
import { initLanguage } from './i18n'

// Apply persisted language before first render (no flash).
initLanguage()

const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/png'
favicon.href = symbolUrl
document.head.appendChild(favicon)

function Root() {
  const hydrate = useAuthStore((state) => state.hydrate)
  React.useEffect(() => { hydrate() }, [hydrate])
  return <App />
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
)
