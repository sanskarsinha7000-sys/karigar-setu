import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, Contrast, Crop, Download, Layers, LayoutGrid, Palette, RefreshCw, ScanLine, Sparkles, Sun, Upload, Video, Wand2, Waves } from 'lucide-react'
import { useTranslation } from '../i18n'
import { useDraftStore } from '../store/draftStore'
import { dataUrlToFile, enhanceImage } from '../lib/imageStudioClient'

// Phase 2: AI Image Studio. Classical-CV enhancement via POST /api/enhance
// (Express → FastAPI vision service). NOT deep-learning matting — the UI and the
// backend both say so honestly. Results flow into the EXISTING draftStore contract.
const DEFAULT_OPTIONS = {
  remove_background: false,
  lighting: true,
  white_balance: true,
  denoise: false,
  sharpen: true,
  ecommerce_format: true,
  background: 'white'
}

export default function ImageStudio() {
  const { t } = useTranslation()
  const setDraft = useDraftStore((state) => state.setDraft)
  const navigate = useNavigate()

  const [source, setSource] = useState(null) // { file, url }
  const [result, setResult] = useState(null) // backend payload
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [isEnhancing, setEnhancing] = useState(false)
  const [error, setError] = useState('')
  const [isCameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamRef = useRef(null)
  const sourceUrlRef = useRef(null)

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
  }, [])

  const usePickedFile = (file) => {
    if (!file) return
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    const url = URL.createObjectURL(file)
    sourceUrlRef.current = url
    setSource({ file, url })
    setResult(null)
    setError('')
  }

  const openCamera = async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('studio.cameraUnavailable'))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } })
      streamRef.current = stream
      setCameraOpen(true)
    } catch (cameraFailure) {
      setCameraError(cameraFailure?.name === 'NotAllowedError' ? t('studio.cameraDenied') : t('studio.cameraUnavailable'))
    }
  }

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [isCameraOpen])

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setCameraError(t('studio.cameraUnavailable'))
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      closeCamera()
      if (blob) usePickedFile(new File([blob], 'captured-product.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  }

  const setOption = (key, value) => setOptions((current) => ({ ...current, [key]: value }))

  const runEnhance = async () => {
    if (!source || isEnhancing) return
    setError('')
    setEnhancing(true)
    try {
      const payload = await enhanceImage(source.file, options)
      setResult(payload)
    } catch (enhanceFailure) {
      setError(enhanceFailure?.message || t('studio.failed'))
      setResult(null)
    } finally {
      setEnhancing(false)
    }
  }

  const applyEnhancedToDraft = async (route) => {
    if (!result?.image?.data_url || isEnhancing) return
    const extension = result.image.format === 'png' ? 'png' : 'jpg'
    const file = await dataUrlToFile(result.image.data_url, `enhanced-product.${extension}`)
    // Existing draftStore contract (same shape ProductUpload sets for the scanner flow).
    // Merge over the current draft so structured fields (category, material, technique,
    // origin, title/description, CLIP results) are preserved — setDraft replaces wholesale.
    setDraft({ ...useDraftStore.getState().draft, image: result.image.data_url, imageFile: file, imageName: file.name })
    navigate(route)
  }

  const downloadResult = () => {
    if (!result?.image?.data_url) return
    const extension = result.image.format === 'png' ? 'png' : 'jpg'
    const link = document.createElement('a')
    link.href = result.image.data_url
    link.download = `enhanced-product.${extension}`
    link.click()
  }

  const resetAll = () => {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    sourceUrlRef.current = null
    setSource(null)
    setResult(null)
    setError('')
    setOptions(DEFAULT_OPTIONS)
  }

  const toggleStyle = (active) => `flex items-center gap-2 p-2 rounded-md text-sm ${active ? 'bg-terracotta/10 text-rust' : 'text-gray-700 hover:bg-gray-50'}`
  const backgroundChoices = [
    { value: 'white', label: t('studio.backgroundWhite') },
    { value: 'gray', label: t('studio.backgroundGray') },
    { value: 'transparent', label: t('studio.backgroundTransparent') }
  ]

  return (
    <div>
      <h1 className="text-2xl font-heading text-rust flex items-center gap-2"><Sparkles size={22} /> AI Image Studio</h1>
      <p className="text-gray-600">{t('studio.subtitle')}</p>
      <p className="mt-3 flex items-start gap-2 text-sm rounded-md bg-gold/10 text-rust p-3">
        <Sparkles size={16} className="shrink-0 mt-0.5" /> {t('studio.grabcutWarning')}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => usePickedFile(event.target.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="px-3 py-2 rounded-md border text-sm flex items-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={isEnhancing}>
              <Upload size={16} /> {source ? t('studio.changeImage') : t('studio.chooseImage')}
            </button>
            <button type="button" className="px-3 py-2 rounded-md border text-sm flex items-center gap-2" onClick={isCameraOpen ? closeCamera : openCamera} disabled={isEnhancing}>
              <Video size={16} /> {isCameraOpen ? t('studio.closeCamera') : t('studio.takePhoto')}
            </button>
          </div>
          {cameraError && <p className="mt-2 text-sm text-red-700">{cameraError}</p>}
          {!source && !isCameraOpen && <p className="mt-2 text-sm text-gray-500">{t('studio.noImageYet')}</p>}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <button type="button" className="px-4 py-2 rounded-md bg-terracotta text-white text-sm flex items-center gap-2 shadow-sm" onClick={runEnhance} disabled={!source || isEnhancing}>
            <Sparkles size={16} /> {isEnhancing ? t('studio.enhancing') : t('studio.enhance')}
          </button>
          {source && <button type="button" className="px-3 py-2 rounded-md border text-sm flex items-center gap-2" onClick={resetAll} disabled={isEnhancing}><RefreshCw size={16} /> {t('studio.enhanceAgain')}</button>}
        </div>
      </div>

      {isCameraOpen && (
        <div className="mt-4 rounded-xl overflow-hidden border bg-black">
          <video ref={videoRef} className="w-full max-h-80 object-contain" playsInline muted />
          <div className="flex justify-center gap-3 p-3">
            <button type="button" className="px-4 py-2 rounded-md bg-terracotta text-white text-sm flex items-center gap-2" onClick={capturePhoto}><Camera size={16} /> {t('studio.capture')}</button>
            <button type="button" className="px-3 py-2 rounded-md border border-white/40 text-white text-sm" onClick={closeCamera}>{t('studio.closeCamera')}</button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl border shadow-sm p-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('studio.before')}</h2>
          <div className="h-64 rounded-lg bg-[#f6f0e6] flex items-center justify-center overflow-hidden">
            {source ? <img src={source.url} alt={t('studio.before')} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-gray-400">—</span>}
          </div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('studio.after')}</h2>
          <div className="h-64 rounded-lg bg-[#f6f0e6] flex items-center justify-center overflow-hidden relative">
            {isEnhancing && <RefreshCw size={26} className="animate-spin text-rust" />}
            {!isEnhancing && result?.image?.data_url && <img src={result.image.data_url} alt={t('studio.after')} className="max-h-full max-w-full object-contain" />}
            {!isEnhancing && !result && <span className="text-xs text-gray-400">—</span>}
          </div>
          {result && <p className="mt-2 text-xs text-gray-600 flex items-center gap-1"><Check size={13} className="text-forest" /> {t('studio.resultReady')} · {result.image.width}×{result.image.height} · {result.image.format.toUpperCase()}</p>}
        </div>
      </div>
      {/* OPTIONS_AND_ACTIONS */}
      <div className="mt-4 bg-white rounded-xl border shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('studio.options')}</h2>
        <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          <button type="button" className={toggleStyle(options.remove_background)} onClick={() => setOption('remove_background', !options.remove_background)}><Wand2 size={15} /> {t('studio.removeBackground')}</button>
          <button type="button" className={toggleStyle(options.lighting)} onClick={() => setOption('lighting', !options.lighting)}><Sun size={15} /> {t('studio.lightingCorrection')}</button>
          <button type="button" className={toggleStyle(options.white_balance)} onClick={() => setOption('white_balance', !options.white_balance)}><Palette size={15} /> {t('studio.whiteBalance')}</button>
          <button type="button" className={toggleStyle(options.denoise)} onClick={() => setOption('denoise', !options.denoise)}><Waves size={15} /> {t('studio.denoise')}</button>
          <button type="button" className={toggleStyle(options.sharpen)} onClick={() => setOption('sharpen', !options.sharpen)}><Contrast size={15} /> {t('studio.sharpen')}</button>
          <button type="button" className={toggleStyle(options.ecommerce_format)} onClick={() => setOption('ecommerce_format', !options.ecommerce_format)}><Crop size={15} /> {t('studio.ecommerceFormat')}</button>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 flex items-center gap-1"><Layers size={14} /> {t('studio.background')}:</span>
          {backgroundChoices.map((choice) => (
            <button key={choice.value} type="button" className={`px-3 py-1.5 rounded-md border text-xs ${options.background === choice.value ? 'border-terracotta text-rust bg-terracotta/10' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setOption('background', choice.value)}>{choice.label}</button>
          ))}
        </div>
        {options.remove_background && options.background === 'transparent' && <p className="mt-2 text-xs text-gray-500">{t('studio.backgroundTransparent')} → PNG</p>}
        {result?.operations?.length > 0 && <p className="mt-3 text-xs text-gray-500">{t('studio.operations')}: {result.operations.join(', ')}</p>}
      </div>

      {result?.image?.data_url && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="px-4 py-2 rounded-md bg-terracotta text-white text-sm flex items-center gap-2 shadow-sm" onClick={() => applyEnhancedToDraft('/scanner')} disabled={isEnhancing}><ScanLine size={16} /> {t('studio.useInScanner')}</button>
          <button type="button" className="px-4 py-2 rounded-md border text-sm flex items-center gap-2" onClick={() => applyEnhancedToDraft('/catalog')} disabled={isEnhancing}><LayoutGrid size={16} /> {t('studio.useInCatalog')}</button>
          <button type="button" className="px-4 py-2 rounded-md border text-sm flex items-center gap-2" onClick={downloadResult}><Download size={16} /> {t('studio.download')}</button>
        </div>
      )}
    </div>
  )
}

