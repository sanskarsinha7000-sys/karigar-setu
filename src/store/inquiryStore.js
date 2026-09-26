import create from 'zustand'
import inquiries from '../data/mockInquiries.json'

export const useInquiryStore = create((set) => ({
  inquiries: inquiries,
  reply: (id, message) => set((state) => ({ inquiries: state.inquiries.map(i => i.id === id ? { ...i, reply: message, repliedAt: new Date().toISOString() } : i) })),
  addInquiry: (productId, buyerName, message) => {
    const id = 'I' + String(Math.floor(Math.random()*900)+100)
    const next = { id, productId, buyerName, message, date: new Date().toISOString().split('T')[0], smsFallback: false }
    set((state) => ({ inquiries: [next, ...state.inquiries] }))
  },
  sendSMS: (id) => set((state) => ({ inquiries: state.inquiries.map(i => i.id === id ? { ...i, smsFallback: true } : i) }))
}))
