import { create } from 'zustand'

const TOKEN_KEY = 'kult_auth_token'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  loading: true,

  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ user, token, loading: false })
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null, token: null, loading: false })
  },

  setLoading: (loading) => set({ loading }),

  authHeaders: () => {
    const token = get().token
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
}))
