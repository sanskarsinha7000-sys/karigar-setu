import create from 'zustand'

export const useCartStore = create((set) => ({
  items: [],
  add: (product) => set((state) => {
    const existing = state.items.find((item) => item.id === product.id)
    if (existing) return { items: state.items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) }
    return { items: [...state.items, { ...product, qty: 1 }] }
  }),
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  decrement: (id) => set((state) => ({ items: state.items.flatMap((item) => item.id === id && item.qty > 1 ? [{ ...item, qty: item.qty - 1 }] : item.id === id ? [] : [item]) })),
  clear: () => set({ items: [] })
}))
