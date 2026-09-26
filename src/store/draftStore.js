import create from 'zustand'

export const useDraftStore = create((set) => ({
  draft: null,
  setDraft: (d) => set({ draft: d }),
  clearDraft: () => set({ draft: null })
}))
