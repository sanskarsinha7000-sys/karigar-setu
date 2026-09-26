import React from 'react'
import { useForm } from 'react-hook-form'
import { useArtisanStore } from '../store/artisanStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useTranslation } from '../i18n'

export default function AddArtisan(){
  const { register, handleSubmit } = useForm()
  const addArtisan = useArtisanStore(s=>s.addArtisan)
  const { t } = useTranslation()

  const onSubmit = (data) => {
    const id = 'A' + String(Math.floor(Math.random()*900+100))
    const pin = Math.floor(1000 + Math.random()*9000)
    addArtisan({ id, ...data })
    alert(t('addArtisan.addedAlert', { id, pin }))
  }

  return (
    <div>
      <h1 className="text-2xl font-heading text-rust">{t('nav.addArtisan')}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid grid-cols-2 gap-4">
        <input {...register('name')} placeholder={t('addArtisan.fieldName')} className="p-2 rounded-md" />
        <input {...register('village')} placeholder={t('addArtisan.fieldVillage')} className="p-2 rounded-md" />
        <input {...register('craft')} placeholder={t('addArtisan.fieldCraft')} className="p-2 rounded-md" />
        <input {...register('language')} placeholder={t('cataloger.lblLanguage')} className="p-2 rounded-md" />
        <input {...register('affiliation')} placeholder={t('addArtisan.fieldAffiliation')} className="p-2 rounded-md" />
        <div className="col-span-2"><Button type="submit">{t('addArtisan.submit')}</Button></div>
      </form>
      <div className="mt-6">
        <Card>
          <h3 className="font-medium">{t('addArtisan.confirmationTitle')}</h3>
          <p className="text-sm text-gray-600">{t('addArtisan.confirmationBody')}</p>
        </Card>
      </div>
    </div>
  )
}
