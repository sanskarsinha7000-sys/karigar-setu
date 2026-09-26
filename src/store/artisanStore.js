import create from 'zustand'
import artisans from '../data/mockArtisans.json'

export const useArtisanStore = create((set) => ({
  artisans: artisans,
  addArtisan: (a) => set((state) => ({ artisans: [a, ...state.artisans] }))
}))
