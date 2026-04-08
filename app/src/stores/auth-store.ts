import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserSession {
  id: string
  nombre: string
  email: string
  roles: string[]
  puntosStock: {
    id: string
    nombre: string
    codigo: string
    esEncargado: boolean
    puedeAprobar: boolean
  }[]
  esAdmin: boolean
}

interface AuthState {
  user: UserSession | null
  token: string | null
  setUser: (user: UserSession, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'deposito-auth',
    }
  )
)
