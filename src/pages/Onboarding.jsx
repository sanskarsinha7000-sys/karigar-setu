import React from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import BrandLogo from '../components/shared/BrandLogo'
import { useTranslation } from '../i18n'

export default function Onboarding() {
  const nav = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="max-w-3xl mx-auto mt-20 onboarding-page">
      <BrandLogo className="onboarding-brand" />
      <h1 className="text-4xl font-heading text-rust">{t('onboarding.welcome')}</h1>
      <p className="mt-4 text-gray-700">{t('onboarding.tagline')}</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={() => nav('/login')}>{t('onboarding.getStarted')}</Button>
        <button className="text-rust" onClick={() => nav('/login')}>{t('onboarding.skipIntro')}</button>
      </div>
    </div>
  )
}
