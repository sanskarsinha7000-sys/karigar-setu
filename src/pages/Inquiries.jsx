import React, { useState } from 'react'
import { useInquiryStore } from '../store/inquiryStore'
import { useTranslation } from '../i18n'

export default function Inquiries(){
  const inquiries = useInquiryStore(s=>s.inquiries)
  const replyTo = useInquiryStore(s=>s.reply)
  const sendSMS = useInquiryStore(s=>s.sendSMS)
  const { t } = useTranslation()
  const [drafts, setDrafts] = useState({})

  return (
    <div>
      <h1 className="text-2xl font-heading text-rust">{t('inquiries.title')}</h1>
      <div className="mt-4 space-y-3">
        {inquiries.map(i=> (
          <div key={i.id} className="bg-white p-3 rounded-md">
            <div className="flex justify-between"><strong>{i.buyerName}</strong><span className="text-sm text-gray-500">{i.date}</span></div>
            <p className="text-sm text-gray-700">{i.message}</p>
            <div className="text-sm text-gray-500">{t('inquiries.smsFallback')}: {i.smsFallback ? t('inquiries.sent') : t('inquiries.notSent')}</div>
            <div className="mt-2">
              <textarea placeholder={t('inquiries.replyPlaceholder')} value={drafts[i.id] || ''} onChange={(e)=>setDrafts(d=>({...d,[i.id]:e.target.value}))} className="w-full p-2 rounded-md" />
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-2 bg-terracotta text-white rounded-md" onClick={()=>{replyTo(i.id, drafts[i.id]||t('inquiries.defaultReply')); alert(t('inquiries.replySentAlert'))}}>{t('inquiries.sendReply')}</button>
                <button className="px-3 py-2 border rounded-md" onClick={()=>{sendSMS(i.id); alert(t('inquiries.smsSentAlert'))}}>{t('inquiries.sendSms')}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
