import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

interface User {
  id: string
  name: string
  email: string
  username: string
  role: string
  status: string
  permissions: Record<string, boolean>
  last_login?: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,

      login: async (username: string, password: string) => {
        const response = await api.post('/auth/login', { username, password })
        const { access_token: newToken, user: newUser } = response.data
        set({ token: newToken, user: newUser })
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {}
        set({ token: null, user: null })
      },

      hasPermission: (permission: string): boolean => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'Administrador Master') return true
        return user.permissions?.[permission] === true
      },

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'Administrador Master'
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
