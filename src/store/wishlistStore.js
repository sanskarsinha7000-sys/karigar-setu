import create from 'zustand'

export const useWishlistStore = create((set) => ({
  items: [],
  toggle: (product) => set((state) => ({
    items: state.items.some((item) => item.id === product.id)
      ? state.items.filter((item) => item.id !== product.id)
      : [...state.items, product]
  })),
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
}))
