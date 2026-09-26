import React, { useState, useEffect } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { useDraftStore } from '../store/draftStore'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../i18n'

const SCAN_STATUS_LINES = [
  'Analyzing product...',
  'Identifying material...',
  'Detecting craftsmanship...',
  'Generating catalog details...'
]
const SCAN_STATUS_HI_LINES = [
  'उत्पाद का विश्लेषण कर रहे हैं…',
  ' सामग्री की पहचान कर रहे हैं…',
  ' शिल्पकृति का पता लगा रहे हैं…',
  ' कैटलॉग विवरण उत्पन्न कर रहे हैं…'
]

// Clean professional scanning card (replaces the 3D ScannerScene HUD).
function ScannerCard({ analyzing, result, file }) {
  const { t, language } = useTranslation()
  const lines = language === 'hi' ? SCAN_STATUS_HI_LINES : SCAN_STATUS_LINES
  const [lineIdx, setLineIdx] = useState(0)
  const [preview, setPreview] = useState('')

  // Preview URL for the selected file; revoked as soon as the file changes.
  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!analyzing) {
      setLineIdx(0)
      return
    }
    const id = setInterval(() => setLineIdx((i) => (i + 1) % lines.length), 1600)
    return () => clearInterval(id)
  }, [analyzing, lines])

  if (!file) return null

  return (
    <div className="scanner-card" role="status" aria-live={analyzing ? 'polite' : 'off'}>
      <div className="scanner-card-head">
        <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
        <span className="scanner-card-title">{t('scanner.title')}</span>
        {analyzing ? (
          <span className="scanner-card-tag">{t('scanner.analyzing')}</span>
        ) : result ? (
          <span className="scanner-card-tag">{t('scanner.resultsReady')}</span>
        ) : null}
      </div>
      <div className="scanner-frame">
        {preview && <img src={preview} alt={file.name} className="scanner-image" />}
        <span className="scanner-corner scanner-corner-tl" aria-hidden="true" />
        <span className="scanner-corner scanner-corner-tr" aria-hidden="true" />
        <span className="scanner-corner scanner-corner-bl" aria-hidden="true" />
        <span className="scanner-corner scanner-corner-br" aria-hidden="true" />
        {analyzing && (
          <>
            <span className="scanner-overlay" aria-hidden="true" />
            <span className="scanner-scanline" aria-hidden="true" />
          </>
        )}
      </div>
      <div className="scanner-meta">
        {analyzing ? (
          <>
            <div className="scanner-status">
              <span className="scanner-pulse" aria-hidden="true" />
              <span className="scanner-status-text">{lines[lineIdx]}</span>
              <span className="scanner-dots" aria-hidden="true">
                <i>.</i><i>.</i><i>.</i>
              </span>
            </div>
            <div className="scanner-progress">
              <span className="scanner-progress-bar" />
            </div>
          </>
        ) : result ? (
          <div className="scanner-complete">
            <span className="scanner-check" aria-hidden="true">
              <Check size={13} strokeWidth={3} />
            </span>
            <span>{t('scanner.resultsReady')}</span>
          </div>
        ) : (
          <div className="scanner-idle">{t('scanner.shutterIdle')}</div>
        )}
      </div>
    </div>
  )
}

export default function AIScanner(){
  const { t, aiValue } = useTranslation()
  const draft = useDraftStore(s=>s.draft)
  const setDraft = useDraftStore(s=>s.setDraft)
  const nav = useNavigate()
  const [file, setFile] = useState(draft?.imageFile || null)
  const [result, setResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    if (!file) {
      setError(t('scanner.chooseImageFirst'))
      return
    }
    setError('')
    setAnalyzing(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/analyze', { method: 'POST', body })
      const text = await response.text()
      if (!response.ok) {
        let message = t('scanner.analysisFailed')
        if (text) {
          try {
            const parsed = JSON.parse(text)
            const rawDetail = Array.isArray(parsed.detail)
              ? parsed.detail.map((item) => item.msg).filter(Boolean).join(', ')
              : parsed.detail
            message = parsed.error || rawDetail || message
          } catch (parseError) {
            console.error('[AIScanner] JSON parse error on error body:', parseError)
            message = text || message
          }
        }
        console.error('[AIScanner] non-ok response, throwing:', message)
        throw new Error(message)
      }
      if (!text) {
        const noBodyError = new Error(t('scanner.analysisFailed') + ' (empty response)')
        console.error('[AIScanner]', noBodyError.message)
        throw noBodyError
      }
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('[AIScanner] JSON parse error on success body:', parseError, 'text:', text.slice(0, 200))
        throw new Error(t('scanner.analysisFailed') + ' (invalid json)')
      }
      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error(t('scanner.couldNotReadImage')))
        reader.readAsDataURL(file)
      })
      setResult(data)
      setDraft({ ...draft, image: imageDataUrl, imageFile: file, ...data })
    } catch (requestError) {
      console.error('[AIScanner] caught error:', requestError)
      setError(requestError.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const confidence = (value) => `${Math.round((Number(value) || 0) * 100)}%`

  return (
    <div>
      <h1 className="text-2xl font-heading text-rust">{t('scanner.title')}</h1>
            <p className="text-gray-600">{t('scanner.subtitle')}</p>
      <div className="mt-4 flex items-center gap-3">
        <input type="file" accept="image/*" onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); setError('') }} />
        <button className="px-3 py-2 rounded-md border text-sm" onClick={analyze} disabled={analyzing}>{analyzing ? t('scanner.analyzing') : t('scanner.analyze')}</button>
      </div>
      <div className="mt-6">
        <ScannerCard analyzing={analyzing} result={result} file={file} />
      </div>
      {error && <pre className="mt-3 text-sm text-red-700 whitespace-pre-wrap">{error}</pre>}
      {result && <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="bg-white rounded-md shadow-sm p-4"><span className="text-xs text-gray-500">{t('scanner.category')}</span><div className="flex items-center justify-between"><strong>{aiValue('category', result.category)}</strong><span className="text-xs bg-gray-100 rounded px-2 py-1">{confidence(result.category_confidence)}</span></div></div>
        <div className="bg-white rounded-md shadow-sm p-4"><span className="text-xs text-gray-500">{t('scanner.material')}</span><div className="flex items-center justify-between"><strong>{aiValue('material', result.material)}</strong><span className="text-xs bg-gray-100 rounded px-2 py-1">{confidence(result.material_confidence)}</span></div></div>
        <div className="bg-white rounded-md shadow-sm p-4"><span className="text-xs text-gray-500">{t('scanner.technique')}</span><div className="flex items-center justify-between"><strong>{aiValue('technique', result.technique)}</strong><span className="text-xs bg-gray-100 rounded px-2 py-1">{confidence(result.technique_confidence)}</span></div></div>
        <div className="bg-white rounded-md shadow-sm p-4"><span className="text-xs text-gray-500">{t('scanner.dominantColors')}</span><div className="mt-2 flex gap-2">{result.dominant_colors.map((color) => <span key={color} title={color} className="h-8 w-8 rounded-full border" style={{ backgroundColor: color }} />)}</div></div>
        <button className="md:col-span-2 px-3 py-2 rounded-md border text-sm" onClick={() => nav('/catalog')}>{t('scanner.continueToCatalog')}</button>
      </div>}
    </div>
  )
}
