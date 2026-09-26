import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from '../i18n'
import { fetchCatalogerCapabilities, transcribeAudio, generateCatalogCopy } from '../lib/catalogerClient'
import { CATALOGER_LANGUAGES, browserSpeechSupport } from '../lib/catalogerLanguages'
import { createAudioRecorder, formatDuration, exportWav } from '../lib/audioRecorder'
import { readBhashiniPreference, writeBhashiniPreference } from '../lib/catalogerPrefs'
import { useDraftStore } from '../store/draftStore'
import { useNavigate } from 'react-router-dom'

// Browser speech-recognition availability check. Defined locally so the render
// body can call it without an extra import (the page used it but never imported it).
function isBrowserSpeechSupported() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

function CatalogField({ label, value, onChange, placeholder, help, lang, className }) {
  const cls = className || 'catalog-field'
  return (
    <div className={cls}>
      <label className="catalog-field-label">{label}{lang ? ` — ${lang}` : ''}</label>
      <textarea
        className="catalog-field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        aria-label={label}
      />
      {help && <div className="catalog-field-help">{help}</div>}
    </div>
  )
}

export default function AutoCataloger() {
  const { t, aiValue } = useTranslation()
  const nav = useNavigate()
  const [capabilities, setCapabilities] = useState(null)
  const [capLoading, setCapLoading] = useState(true)
  const [capError, setCapError] = useState('')
  const [selectedLang, setSelectedLang] = useState(CATALOGER_LANGUAGES[0])
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [recorder, setRecorder] = useState(null)
  const [recordingState, setRecordingState] = useState('idle')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingMime, setRecordingMime] = useState('')
  const [micError, setMicError] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [transcribeProvider, setTranscribeProvider] = useState('')
  const [transcribeWarning, setTranscribeWarning] = useState('')
  const [describing, setDescribing] = useState(false)
  const [describeError, setDescribeError] = useState('')
  const [catalog, setCatalog] = useState(null)
  const [describeWarnings, setDescribeWarnings] = useState([])
  const [saved, setSaved] = useState(false)
  const [fields, setFields] = useState({ title: '', category: '', material: '', technique: '', origin: '', details: '' })
  const pickerRef = useRef(null)
  const langBtnRef = useRef(null)
  const langOptionRefs = useRef([])
  const setField = (key) => (value) => setFields((state) => ({ ...state, [key]: value }))
  const recognitionRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const caps = await fetchCatalogerCapabilities()
        if (!cancelled) setCapabilities(caps)
      } catch (err) {
        if (!cancelled) setCapError(err.message || t('cataloger.capsError'))
      } finally {
        if (!cancelled) setCapLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!showLangPicker) return
    const onClick = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setShowLangPicker(false)
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      const focusInside = Boolean(pickerRef.current && pickerRef.current.contains(document.activeElement)) || document.activeElement === langBtnRef.current
      setShowLangPicker(false)
      if (focusInside) langBtnRef.current?.focus()
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showLangPicker])

  // Move focus to the selected option when the picker opens so arrows can navigate it.
  useEffect(() => {
    if (!showLangPicker) return
    const index = CATALOGER_LANGUAGES.findIndex((lang) => lang.code === selectedLang.code)
    const target = langOptionRefs.current[index >= 0 ? index : 0]
    if (target) target.focus()
  }, [showLangPicker])

  const backendProviders = capabilities ? capabilities.providers.filter((p) => p.kind !== 'browser') : []
  const browserProvider = capabilities ? capabilities.providers.find((p) => p.kind === 'browser') : null
  const selectedLangSpeechSupport = browserSpeechSupport(selectedLang.code)
  const canUseBrowserSpeech = selectedLangSpeechSupport && selectedLangSpeechSupport.supported && isBrowserSpeechSupported()
  const browserSpeechAvailable = canUseBrowserSpeech && recordingMime && recordingState === 'idle' && !transcribing

  const backendProviderCandidates = backendProviders.filter((p) => p.available)
  const prefersBhashini = readBhashiniPreference()
  const [selectedProvider, setSelectedProvider] = useState(() => {
    if (backendProviderCandidates.length === 0) return null
    if (backendProviderCandidates.length === 1) return backendProviderCandidates[0].provider
    if (prefersBhashini) return 'Bhashini'
    return 'Google Cloud Speech-to-Text'
  })
  const selectedProviderAvailable = backendProviderCandidates.some((p) => p.provider === selectedProvider)
  // No server-side ASR provider is configured for this deployment.
  const noServerAsrProvider = Boolean(capabilities) && backendProviderCandidates.length === 0

  const startRecording = useCallback(async () => {
    setMicError('')
    try {
      const rec = createAudioRecorder({ onTick: setRecordingSeconds, onStateChange: setRecordingState })
      setRecorder(rec)
      setRecordingMime('')
      await rec.start()
    } catch (err) {
      setRecorder(null)
      if (err && err.code === 'denied') setMicError(t('cataloger.micDenied'))
      else if (err && err.code === 'unavailable') setMicError(t('cataloger.micUnavailable'))
      else if (err && err.code === 'unsupported') setMicError(t('cataloger.recordingUnsupported'))
      else setMicError(err && err.message ? err.message : t('cataloger.micError'))
    }
  }, [t])

  const stopRecording = useCallback(async () => {
    if (!recorder) return
    try {
      const result = await recorder.stop()
      if (result && result.blob && result.blob.size) {
        setRecordingMime(result.mimeType || 'audio/webm')
        setMicError('')
      } else {
        setMicError(t('cataloger.noAudioCaptured'))
      }
    } catch (err) {
      setMicError(err && err.message ? err.message : t('cataloger.stopError'))
      setRecordingMime('')
    }
  }, [recorder, t])

  const resetRecording = useCallback(() => {
    if (recorder) {
      try { recorder.reset() } catch (err) { /* ignore */ }
      setRecorder(null)
    }
    setRecordingState('idle')
    setRecordingSeconds(0)
    setRecordingMime('')
    setMicError('')
  }, [recorder])

  const startBrowserTranscription = useCallback(async () => {
    if (!canUseBrowserSpeech) return
    setTranscribing(true)
    setTranscribeError('')
    setTranscribeProvider('')
    setTranscribeWarning('')
    let recognition = null
    try {
      const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
      if (!SR) throw new Error('browserWebSpeech')
      recognition = new SR()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognition.lang = selectedLang.speechCode || selectedLang.code
      recognitionRef.current = recognition
      recognition.onresult = (event) => {
        let best = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            const alt = result[0] ? String(result[0].transcript) : ''
            if (alt) setTranscript((prev) => (prev ? `${prev} ${alt}`.trim() : alt))
          } else if (result.length && result[0] && result[0].transcript) {
            best = result[0].transcript
          }
        }
        if (best) {
          setTranscribeProvider('browser')
          setTranscribeWarning('This is a browser speech-recognition estimate. Final accuracy depends on your browser and the language. If the result is wrong, type or paste the product description directly, or record again.')
        }
      }
      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          // Treat silence as a soft failure but do not claim transcription succeeded.
          setTranscribeWarning('No speech was recognized. Try recording again with clearer audio, or type the product description directly.')
        } else if (event.error === 'aborted') {
          // deliberate stop - leave transcript untouched
        } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setTranscribeError(t('cataloger.micDenied'))
        } else if (event.error === 'no-match') {
          setTranscribeWarning('The browser could not match the speech to the selected language. Try a different language or type the description directly.')
        } else {
          setTranscribeError(t('cataloger.transcriptionFailed'))
        }
      }
      recognition.onend = () => {
        recognitionRef.current = null
        setTranscribing(false)
      }
      recognition.start()
    } catch (err) {
      if (recognition) try { recognition.abort() } catch (e) { /* ignore */ }
      recognitionRef.current = null
      if (err && err.message === 'browserWebSpeech') {
        // If browser doesn't expose SpeechRecognition at all, the path is simply unavailable.
        setTranscribeError(t('cataloger.browserSpeechUnavailable'))
      } else if (err && err.code === 'denied') {
        setTranscribeError(t('cataloger.micDenied'))
      } else {
        setTranscribeError(err && err.message ? err.message : t('cataloger.transcriptionFailed'))
      }
      setTranscribing(false)
    }
  }, [canUseBrowserSpeech, selectedLang.speechCode, selectedLang.code, t])

  const cancelBrowserTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {
        /* ignore abort errors */
      }
      recognitionRef.current = null
    }
    setTranscribing(false)
    setTranscribeError('')
  }, [])

  // Stop an in-flight browser recognition if the page unmounts while it is still listening.
  useEffect(() => () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {
        /* ignore abort errors */
      }
      recognitionRef.current = null
    }
  }, [])

  const handleTranscribe = useCallback(async () => {
    if (!recordingMime) {
      setTranscribeError(t('cataloger.noRecordingToTranscribe') || 'Record audio first.')
      return
    }
    // With no configured ASR provider the server answers 503 and points at the browser
    // speech-recognition fallback, so use that existing path instead of calling the server.
    if (noServerAsrProvider && canUseBrowserSpeech) {
      await startBrowserTranscription()
      return
    }
    setTranscribing(true)
    setTranscribeError('')
    setTranscribeProvider('')
    setTranscribeWarning('')
    try {
      const captured = recorder && typeof recorder.getBlob === 'function' ? recorder.getBlob() : null
      if (!captured || !captured.size) {
        setTranscribeError(t('cataloger.noAudioCaptured'))
        return
      }
      const wavBlob = await exportWav(captured)
      if (!wavBlob || !wavBlob.size) {
        setTranscribeError(t('cataloger.noAudioCaptured'))
        return
      }
      const clientId = `recording-${selectedLang.code}-${Date.now()}`
      const result = await transcribeAudio(
        wavBlob,
        selectedLang.code,
        `${clientId}.wav`
      )
      setTranscript(result.transcript || '')
      setTranscribeProvider(result.provider || '')
      setTranscribeWarning(result.warning || null)
      if (!result.transcript) setTranscript('')
    } catch (err) {
      const message = err && err.message ? err.message : t('cataloger.transcriptionFailed')
      setTranscribeError(message)
      setTranscribeWarning(err && err.data && err.data.warning ? err.data.warning : null)
    } finally {
      setTranscribing(false)
    }
  }, [recorder, recordingMime, selectedLang.code, noServerAsrProvider, canUseBrowserSpeech, startBrowserTranscription, t])

  const handleDescribe = useCallback(async () => {
    setDescribing(true)
    setDescribeError('')
    setDescribeWarnings([])
    setCatalog(null)
    try {
      const payload = {
        transcript,
        englishText: transcript && !selectedLangSpeechSupport ? transcript : '',
        hindiText: transcript && selectedLang.code === 'hi' ? transcript : '',
        productName: fields.title,
        category: fields.category,
        material: fields.material,
        technique: fields.technique,
        origin: fields.origin,
        details: fields.details
      }
      const result = await generateCatalogCopy(payload)
      setCatalog(result)
      setDescribeWarnings(result.warnings || [])
    } catch (err) {
      setDescribeError(err && err.message ? err.message : t('cataloger.describeFailed'))
    } finally {
      setDescribing(false)
    }
  }, [transcript, fields, selectedLang.code, selectedLangSpeechSupport, t])

  const pushToDraft = useCallback(() => {
    if (!catalog) return
    const ds = useDraftStore.getState()
    ds.setDraft({
      ...ds.draft,
      category: fields.category,
      material: fields.material,
      technique: fields.technique,
      origin: fields.origin,
      details: fields.details,
      catalogTitle: catalog.english.title,
      catalogDescriptionEn: catalog.english.detailed,
      catalogDescriptionHi: catalog.hindi.detailed,
      catalogTags: catalog.english.keywords,
      catalogHindiTitle: catalog.hindi.title,
      catalogGeneratedAt: new Date().toISOString(),
      catalogDescribedFrom: catalog.languages && catalog.languages.describedFrom
    })
    setSaved(true)
  }, [catalog, fields])

  return (
    <div className="cataloger-page" dir={selectedLang.dir || 'ltr'}>
      <header className="cataloger-header">
        <div>
          <h1 className="cataloger-title">{t('nav.autoCataloger')}</h1>
          <p className="cataloger-sub">{t('cataloger.subtitle')}</p>
        </div>
        {saved && <div className="cataloger-saved">{t('cataloger.saved')}</div>}
      </header>

      <section className="cataloger-section">
        <h2 className="cataloger-h2">{t('cataloger.step1')}</h2>
        <div className="cataloger-lang-row">
          <button
            ref={langBtnRef}
            type="button"
            className="cataloger-lang-btn"
            onClick={() => setShowLangPicker(!showLangPicker)}
            aria-expanded={showLangPicker}
            aria-haspopup="listbox"
          >
            <span className="cataloger-lang-current">{selectedLang.native || selectedLang.english}</span>
            <span className="cataloger-lang-code" aria-hidden="true">{selectedLang.code}</span>
          </button>
          {showLangPicker && (
            <div
              className="cataloger-lang-picker"
              ref={pickerRef}
              role="listbox"
              aria-label={t('common.language') + ' ' + t('cataloger.pickLanguage')}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
                event.preventDefault()
                const options = langOptionRefs.current.filter(Boolean)
                if (options.length === 0) return
                const active = options.indexOf(document.activeElement)
                const step = event.key === 'ArrowDown' ? 1 : -1
                const next = active === -1 ? (step === 1 ? 0 : options.length - 1) : (active + step + options.length) % options.length
                options[next].focus()
              }}
            >
              {CATALOGER_LANGUAGES.map((lang, index) => (
                <button
                  key={lang.code}
                  ref={(el) => { langOptionRefs.current[index] = el }}
                  type="button"
                  className={`cataloger-lang-option ${lang.code === selectedLang.code ? 'is-selected' : ''}`}
                  onClick={() => { setSelectedLang(lang); setShowLangPicker(false); langBtnRef.current?.focus() }}
                  role="option"
                  aria-selected={lang.code === selectedLang.code}
                >
                  <span className="cataloger-lang-option-native">{lang.native || lang.english}</span>
                  <span className="cataloger-lang-option-code">{lang.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="cataloger-lang-info">
          <div><strong>{t('cataloger.speechCode')}</strong> {selectedLang.speechCode}</div>
          {canUseBrowserSpeech
            ? <div><span className="cataloger-tag cataloger-tag-ok">{t('cataloger.speechAvailable')}</span></div>
            : <div><span className="cataloger-tag cataloger-tag-warn">{t('cataloger.speechUnavailable')}</span></div>}
        </div>
      </section>

      <section className="cataloger-section">
        <h2 className="cataloger-h2">{t('cataloger.stepRecord')}</h2>

        {capLoading && <div className="cataloger-loading">{t('common.loading')}</div>}
        {capError && <div className="cataloger-error">{capError}</div>}

        {!capLoading && capabilities && (
          <div className="cataloger-providers">
            <div className="cataloger-providers-label">{t('cataloger.providers')}</div>
            {backendProviders.map((p) => (
              <div key={p.provider} className="cataloger-provider">
                <span className="cataloger-provider-name">{p.provider}</span>
                <span className="cataloger-provider-status">
                  {p.available
                    ? <span className="cataloger-tag cataloger-tag-ok">{t('cataloger.configured')}</span>
                    : <span className="cataloger-tag cataloger-tag-warn">{p.reason || t('cataloger.notConfigured')}</span>}
                </span>
              </div>
            ))}
            <div className="cataloger-provider">
              <span className="cataloger-provider-name">{browserProvider && browserProvider.provider}</span>
              <span className="cataloger-provider-status">
                <span className="cataloger-tag cataloger-tag-ok">{browserProvider && browserProvider.reason}</span>
              </span>
            </div>
          </div>
        )}

        <div className="cataloger-record-row">
          {recordingState === 'idle' && (
            <button type="button" className="cataloger-btn cataloger-btn-record" onClick={startRecording}>
              <span className="cataloger-btn-icon" aria-hidden="true">🎤</span>
              {t('cataloger.startRecording')}
            </button>
          )}
          {recordingState === 'recording' && (
            <button type="button" className="cataloger-btn cataloger-btn-stop" onClick={stopRecording}>
              <span className="cataloger-btn-icon" aria-hidden="true">■</span>
              {t('cataloger.stopRecording')}
            </button>
          )}
          {recordingState === 'idle' && recordingMime && (
            <button type="button" className="cataloger-btn cataloger-btn-reset" onClick={resetRecording}>
              {t('cataloger.newRecording')}
            </button>
          )}
        </div>

        {recordingSeconds > 0 && recordingState !== 'recording' && (
          <div className="cataloger-recording-timer" aria-label={t('cataloger.lastRecordingLength')}>
            {t('cataloger.lastRecording')} {formatDuration(recordingSeconds)} ({recordingMime})
          </div>
        )}

        {micError && <div className="cataloger-error">{micError}</div>}

        <div className="cataloger-transcribe-row">
          <button
            type="button"
            className="cataloger-btn cataloger-btn-transcribe"
            onClick={handleTranscribe}
            disabled={!recordingMime || transcribing}
          >
            {transcribing ? t('cataloger.transcribing') : t('cataloger.transcribe')}
          </button>
          {transcribing && <div className="cataloger-loading-sm">{t('common.loading')}</div>}
        </div>

        {transcribeError && <div className="cataloger-error">{transcribeError}</div>}
        {transcribeWarning && <div className="cataloger-warning">{transcribeWarning}</div>}

        <CatalogField
          label={t('cataloger.lblTranscript')}
          value={transcript}
          onChange={setTranscript}
          placeholder={t('cataloger.transcriptPlaceholder')}
        />
      </section>

      <section className="cataloger-section">
        <h2 className="cataloger-h2">{t('cataloger.stepFields')}</h2>
        <div className="cataloger-fields-grid">
          <CatalogField
            label={t('catalog.titlePh')}
            value={fields.title}
            onChange={setField('title')}
            placeholder={t('cataloger.titlePlaceholder')}
          />
          <CatalogField
            label={t('catalog.categoryPh')}
            value={fields.category}
            onChange={setField('category')}
            placeholder={t('cataloger.categoryPlaceholder')}
          />
          <CatalogField
            label={t('catalog.materialPh')}
            value={fields.material}
            onChange={setField('material')}
            placeholder={t('cataloger.materialPlaceholder')}
          />
          <CatalogField
            label={t('catalog.techniquePh')}
            value={fields.technique}
            onChange={setField('technique')}
            placeholder={t('cataloger.techniquePlaceholder')}
          />
          <CatalogField
            label={t('catalog.originPh')}
            value={fields.origin}
            onChange={setField('origin')}
            placeholder={t('cataloger.originPlaceholder')}
          />
          <CatalogField
            label={t('catalog.descriptionPh')}
            value={fields.details}
            onChange={setField('details')}
            placeholder={t('cataloger.detailsPlaceholder')}
            help={t('cataloger.detailsHelp')}
          />
        </div>
      </section>

      <section className="cataloger-section">
        <h2 className="cataloger-h2">{t('cataloger.stepReview')}</h2>
        <div className="cataloger-describe-row">
          <button
            type="button"
            className="cataloger-btn cataloger-btn-describe"
            onClick={handleDescribe}
            disabled={!transcript && !fields.title && !fields.category && !fields.material && !fields.technique && !describing}
          >
            {describing ? t('common.loading') : t('cataloger.generateCatalog')}
          </button>
          {describeError && <div className="cataloger-error">{describeError}</div>}
          {describeWarnings.map((w, i) => (
            <div key={i} className="cataloger-warning">{w.message}</div>
          ))}
        </div>
      </section>

      {catalog && (
        <section className="cataloger-section">
          <h2 className="cataloger-h2">{t('cataloger.stepReview')}</h2>
          <div className="cataloger-catalog">
            <div className="cataloger-lang-block">
              <h3 className="cataloger-lang-block-title">{t('cataloger.copyEnglish')}</h3>
              <CatalogField
                label={t('catalog.titlePh') + ' — ' + t('cataloger.copyEnglish')}
                value={catalog.english.title}
                onChange={(v) => setCatalog({ ...catalog, english: { ...catalog.english, title: v } })}
                placeholder={t('cataloger.titlePlaceholder')}
              />
              <CatalogField
                label={t('catalog.descriptionPh') + ' — ' + t('cataloger.copyEnglish')}
                value={catalog.english.detailed}
                onChange={(v) => setCatalog({ ...catalog, english: { ...catalog.english, detailed: v } })}
                placeholder={t('cataloger.descriptionPlaceholder')}
                help={t('cataloger.descriptionHelp')}
              />
              <div className="cataloger-tags">
                <span className="cataloger-tags-label">{t('cataloger.tags')}</span>
                <div className="cataloger-tags-list">{catalog.english.keywords.map((tag, i) => <span key={i} className="cataloger-tag-item">{tag}</span>)}</div>
              </div>
            </div>

            <div className="cataloger-lang-block">
              <h3 className="cataloger-lang-block-title">{t('cataloger.copyHindi')}</h3>
              <CatalogField
                label={t('catalog.titlePh') + ' — ' + t('cataloger.copyHindi')}
                value={catalog.hindi.title}
                onChange={(v) => setCatalog({ ...catalog, hindi: { ...catalog.hindi, title: v } })}
                placeholder={t('cataloger.hindiTitlePlaceholder')}
              />
              <CatalogField
                label={t('catalog.descriptionPh') + ' — ' + t('cataloger.copyHindi')}
                value={catalog.hindi.detailed}
                onChange={(v) => setCatalog({ ...catalog, hindi: { ...catalog.hindi, detailed: v } })}
                placeholder={t('cataloger.hindiDescriptionPlaceholder')}
                help={t('cataloger.hindiDescriptionHelp')}
              />
              <div className="cataloger-tags">
                <span className="cataloger-tags-label">{t('cataloger.tags')}</span>
                <div className="cataloger-tags-list">{catalog.hindi.keywords.map((tag, i) => <span key={i} className="cataloger-tag-item">{tag}</span>)}</div>
              </div>
            </div>
          </div>
          <div className="cataloger-actions">
            <button type="button" className="cataloger-btn cataloger-btn-primary" onClick={pushToDraft}>
              {t('cataloger.pushToDraft')}
            </button>
            <button type="button" className="cataloger-btn cataloger-btn-secondary" onClick={() => setSaved(false)}>
              {t('common.close')}
            </button>
          </div>
        </section>
      )}

      {saved && (
        <section className="cataloger-section">
          <div className="cataloger-saved-note">{t('cataloger.savedNote')} <button type="button" className="cataloger-btn cataloger-btn-secondary" onClick={() => nav('/catalog')}>{t('catalog.title')}</button></div>
          <button type="button" className="cataloger-btn cataloger-btn-secondary" onClick={() => { setSaved(false); resetRecording() }}>
            {t('cataloger.newProduct')}
          </button>
        </section>
      )}

      <style>{`
        .cataloger-page { max-width: 880px; margin: 0 auto; padding: 2rem 1rem; }
        .cataloger-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; border-bottom: 1px solid #e5d6c8; padding-bottom: 1rem; }
        .cataloger-title { font-size: 1.65rem; color: #7c3f24; margin: 0; }
        .cataloger-sub { color: #6b6560; margin: 0.3rem 0 0 0; }
        .cataloger-saved { background: #e7f3ec; color: #2f6a4a; padding: 0.5rem 1rem; border-radius: 999px; font-size: 0.85rem; align-self: center; }
        .cataloger-section { margin-top: 1.75rem; padding-top: 1rem; border-top: 1px solid #efe2d4; }
        .cataloger-h2 { font-size: 1.1rem; color: #a04e26; margin: 0 0 0.75rem 0; }
        .cataloger-lang-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; position: relative; }
        .cataloger-lang-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border: 1px solid #d6c3b0; background: #fff; border-radius: 999px; cursor: pointer; }
        .cataloger-lang-current { font-weight: 600; }
        .cataloger-lang-code { color: #8a7c72; font-size: 0.8rem; }
        .cataloger-lang-picker { position: absolute; top: calc(100% + 0.25rem); left: 0; background: #fff; border: 1px solid #d6c3b0; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.08); padding: 0.4rem; display: flex; flex-direction: column; gap: 0.25rem; min-width: 200px; z-index: 20; max-height: 70vh; overflow: auto; }
        .cataloger-lang-option { display: flex; justify-content: space-between; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; text-align: left; background: #fff; border: 0; }
        .cataloger-lang-option:hover { background: #fdf3e7; }
        .cataloger-lang-option.is-selected { background: #fdf0e3; }
        .cataloger-lang-option-native { font-weight: 500; }
        .cataloger-lang-option-code { color: #8a7c72; font-family: monospace; font-size: 0.8rem; }
        .cataloger-lang-info { margin-top: 0.6rem; color: #4f4a46; font-size: 0.9rem; }
        .cataloger-tag { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
        .cataloger-tag-ok { background: #e7f3ec; color: #2f6a4a; }
        .cataloger-tag-warn { background: #fbe9d6; color: #a04e26; }
        .cataloger-providers { background: #fff; border: 1px solid #e5d6c8; border-radius: 8px; padding: 0.75rem; margin-top: 0.75rem; }
        .cataloger-providers-label { font-size: 0.85rem; color: #6b6560; margin-bottom: 0.5rem; }
        .cataloger-provider { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; }
        .cataloger-provider-name { font-weight: 500; }
        .cataloger-provider-status { font-size: 0.8rem; }
        .cataloger-record-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; }
        .cataloger-btn { padding: 0.5rem 1rem; border-radius: 999px; border: 1px solid transparent; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; }
        .cataloger-btn-record { background: #b9532b; color: #fff; }
        .cataloger-btn-record:hover { background: #963f21; }
        .cataloger-btn-stop { background: #c94242; color: #fff; }
        .cataloger-btn-stop:hover { background: #a13333; }
        .cataloger-btn-reset { background: #fff; color: #7c3f24; border-color: #d6c3b0; }
        .cataloger-btn-transcribe { background: #2b2b6b; color: #fff; }
        .cataloger-btn-transcribe:hover { background: #3a3a82; }
        .cataloger-btn-describe { background: #2f6a4a; color: #fff; }
        .cataloger-btn-describe:hover { background: #26563a; }
        .cataloger-btn-primary { background: #D9822B; color: #fff; }
        .cataloger-btn-primary:hover { background: #c16f22; }
        .cataloger-btn-secondary { background: #fff; color: #7c3f24; border-color: #d6c3b0; }
        .cataloger-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cataloger-btn-icon { font-size: 1.1rem; line-height: 1; }
        .cataloger-recording-timer { margin-top: 0.5rem; font-size: 0.9rem; color: #4f4a46; }
        .cataloger-loading { color: #6b6560; font-style: italic; }
        .cataloger-loading-sm { margin-left: 0.5rem; font-size: 0.85rem; color: #6b6560; }
        .cataloger-error { background: #fdecea; color: #a5271b; padding: 0.6rem 0.9rem; border-radius: 8px; margin-top: 0.6rem; font-size: 0.9rem; }
        .cataloger-warning { background: #fff8e6; color: #8a5a1f; padding: 0.6rem 0.9rem; border-radius: 8px; margin-top: 0.6rem; font-size: 0.9rem; }
        .cataloger-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .catalog-field { display: flex; flex-direction: column; gap: 0.3rem; }
        .catalog-field-label { font-weight: 600; color: #4f4a46; font-size: 0.9rem; }
        .catalog-field-input { padding: 0.5rem 0.75rem; border: 1px solid #d6c3b0; border-radius: 8px; background: #fff; color: #2b2b2b; font-size: 0.95rem; resize: vertical; min-height: 3rem; font-family: inherit; }
        .catalog-field-help { font-size: 0.8rem; color: #6b6560; }
        .cataloger-describe-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .cataloger-catalog { background: #fff; border: 1px solid #e5d6c8; border-radius: 10px; padding: 1.25rem; }
        .cataloger-lang-block { margin-bottom: 1.5rem; }
        .cataloger-lang-block:last-child { margin-bottom: 0; }
        .cataloger-lang-block-title { font-size: 1rem; color: #a04e26; border-bottom: 1px solid #efe2d4; padding-bottom: 0.4rem; margin-bottom: 0.75rem; }
        .cataloger-tags { margin-top: 0.6rem; }
        .cataloger-tags-label { font-size: 0.85rem; color: #6b6560; display: block; margin-bottom: 0.25rem; }
        .cataloger-tags-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .cataloger-tag-item { background: #fdf0e3; color: #7c3f24; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; border: 1px solid #e9c89a; }
        .cataloger-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .cataloger-saved-note { background: #e7f3ec; color: #2f6a4a; padding: 0.75rem 1rem; border-radius: 8px; }
        @media (max-width: 640px) { .cataloger-fields-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}

