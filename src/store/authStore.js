import create from 'zustand'

const api = async (path, options = {}) => {
  const response = await fetch(path, { credentials: 'include', ...options })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Request failed')
  return body
}

export const useAuthStore = create((set) => ({
  user: null,
  role: 'operator',
  loading: false,
  hydrate: async () => {
    try {
      const body = await api('/api/auth/me')
      set({ user: body.user, role: body.user?.role || 'operator' })
    } catch {
      set({ user: null })
    }
  },
  login: async (identifier, password) => {
    const body = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) })
    set({ user: body.user, role: body.user.role })
    return body.user
  },
  signup: async (payload) => {
    const body = await api('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    set({ user: body.user, role: body.user.role })
    return body.user
  },
  requestOtp: (identifier) => api('/api/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier }) }),
  verifyOtp: async (identifier, code) => {
    const body = await api('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, code }) })
    set({ user: body.user, role: body.user.role })
    return body.user
  },
  logout: async () => {
    await api('/api/auth/logout', { method: 'POST' })
    set({ user: null, role: 'operator' })
  }
}))
