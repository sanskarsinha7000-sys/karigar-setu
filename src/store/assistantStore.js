import create from 'zustand'

const welcomeMessage = {
  id: 'assistant-welcome',
  role: 'bot',
  text: 'Namaste! I am the Karigar Setu Assistant. Ask me about pricing, listings, artisans, or buyer inquiries.',
  createdAt: Date.now()
}

export const useAssistantStore = create((set) => ({
  messages: [welcomeMessage],
  responseCount: 0,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  incrementResponses: () => set((state) => ({ responseCount: state.responseCount + 1 })),
  clearMessages: () => set({ messages: [welcomeMessage], responseCount: 0 })
}))
