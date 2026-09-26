import create from 'zustand'
import products from '../data/mockProducts.json'

function nextId() {
  const n = Math.floor(Math.random() * 900) + 100
  return `P${n}`
}

export const useProductStore = create((set, get) => ({
  products: products.map(p => ({...p, status: 'synced'})),
  publish: (product) => {
    const id = product.id || nextId()
    const queued = { ...product, id, status: 'queued' }
    set((state) => ({ products: [queued, ...state.products] }))

    // simulate offline-sync: queued -> syncing -> synced
    setTimeout(() => {
      set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, status: 'syncing' } : p) }))
      setTimeout(() => {
        set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, status: 'synced' } : p) }))
      }, 1200)
    }, 800)

    return id
  },
  update: (id, patch) => set((state) => ({ products: state.products.map(p => p.id === id ? { ...p, ...patch } : p) }))
}))
