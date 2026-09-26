import React, { useState } from 'react'
import Button from '../components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { useDraftStore } from '../store/draftStore'
import { useTranslation } from '../i18n'

export default function ProductUpload(){
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const nav = useNavigate()
  const setDraft = useDraftStore(s=>s.setDraft)

  const toScanner = ()=>{
    if (!file) {
      setDraft({ image: null, imageName: 'image-placeholder', voiceNote: null })
      nav('/scanner')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDraft({ image: reader.result, imageFile: file, imageName: file.name, voiceNote: null })
      nav('/scanner')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <h1 className="text-2xl font-heading text-rust">{t('upload.title')}</h1>
      <div className="mt-4 p-4 bg-white rounded-md shadow-sm">
        <label className="block border-2 border-dashed p-6 rounded-md text-center">
          <input type="file" onChange={(e)=>setFile(e.target.files?.[0])} className="hidden" />
          <div className="text-gray-600">{t('upload.dropHere')}</div>
          <div className="text-sm text-gray-500 mt-2">{file ? file.name : t('upload.noFileSelected')}</div>
        </label>
        <div className="mt-4">
          <div className="h-12 bg-gray-100 rounded-md flex items-center px-3">{t('upload.voiceRecorder')}</div>
        </div>
        <div className="mt-4 flex gap-2"><Button onClick={toScanner}>{t('upload.proceedToScanner')}</Button><button className="px-3 py-2 rounded-md border" onClick={()=>{setDraft({ image: file ? file.name : 'image-placeholder' }); nav('/catalog')}}>{t('upload.skipToCatalog')}</button></div>
      </div>
    </div>
  )
}
