import React, { useMemo } from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useProductStore } from '../store/productStore'
import { useInquiryStore } from '../store/inquiryStore'
import { useTranslation } from '../i18n'

export default function Analytics(){
  const products = useProductStore(s=>s.products)
  const inquiries = useInquiryStore(s=>s.inquiries)
  const { t } = useTranslation()

  const lineData = useMemo(()=>{
    // simple deterministic monthly series based on counts
    const months = [t('analytics.monthMay'), t('analytics.monthJun'), t('analytics.monthJul'), t('analytics.monthAug'), t('analytics.monthSep'), t('analytics.monthOct')]
    const base = Math.max(50, products.length * 12)
    return months.map((m,i)=>({ name: m, views: base + i * 30 + inquiries.length * 2 }))
  },[products.length, inquiries.length, t])

  const barData = [
    { name: t('analytics.metricProducts'), value: products.length },
    { name: t('nav.inquiries'), value: inquiries.length },
    { name: t('analytics.metricPublished'), value: products.filter(p=>p.status === 'synced').length }
  ]

  return (
    <div>
      <h1 className="text-2xl font-heading text-rust">{t('analytics.title')}</h1>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-md">
          <h3 className="font-medium">{t('analytics.viewsOverTime')}</h3>
          <div style={{height:200}}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="views" stroke="#D9822B" /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-4 rounded-md">
          <h3 className="font-medium">{t('analytics.quickMetrics')}</h3>
          <div style={{height:200}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#C9A84D" /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="mt-6 bg-white p-4 rounded-md">
        <h3 className="font-medium">{t('nav.settings')}</h3>
        <div className="mt-2 text-sm text-gray-600">{t('analytics.settingsLine')}</div>
      </div>
    </div>
  )
}
