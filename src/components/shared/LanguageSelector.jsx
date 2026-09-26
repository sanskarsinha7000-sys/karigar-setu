import React, { useEffect, useRef, useState } from 'react'
import { Globe, Check } from 'lucide-react'
import { useTranslation } from '../../i18n'

// Compact language selector for the existing sidebar/login/onboarding areas.
// Uses the existing visual tokens (terracotta/rust accents, white surfaces, rounded corners).
export default function LanguageSelector({ className = '' }) {
  const { t, language, setLanguage, languages } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const optionRefs = useRef([])
  const current = languages.find((item) => item.code === language) || languages[0]

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      const focusInside = Boolean(containerRef.current) && containerRef.current.contains(document.activeElement)
      setOpen(false)
      if (focusInside) buttonRef.current?.focus()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Move focus to the selected option when the listbox opens so arrows can navigate it.
  useEffect(() => {
    if (!open) return undefined
    const index = languages.findIndex((item) => item.code === language)
    const target = optionRefs.current[index >= 0 ? index : 0]
    if (target) target.focus()
    return undefined
  }, [open])

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.selectLanguage')}
        title={t('common.selectLanguage')}
        className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Globe size={15} className="shrink-0 text-rust" />
        <span className="flex-1 text-start">{current.native}</span>
        <span className="text-xs text-gray-500">{current.english}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('common.selectLanguage')}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
            event.preventDefault()
            const options = optionRefs.current.filter(Boolean)
            if (options.length === 0) return
            const active = options.indexOf(document.activeElement)
            const step = event.key === 'ArrowDown' ? 1 : -1
            const next = active === -1 ? (step === 1 ? 0 : options.length - 1) : (active + step + options.length) % options.length
            options[next].focus()
          }}
          className="absolute start-0 z-50 mt-1 max-h-72 w-60 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {languages.map((item, index) => (
            <li key={item.code} role="option" aria-selected={item.code === language}>
              <button
                ref={(el) => { optionRefs.current[index] = el }}
                type="button"
                onClick={() => {
                  setLanguage(item.code)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-start text-sm hover:bg-gray-50 ${
                  item.code === language ? 'bg-terracotta/10 font-semibold text-rust' : 'text-gray-700'
                }`}
              >
                <span>{item.native}</span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  {item.english}
                  {item.code === language && <Check size={13} />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}