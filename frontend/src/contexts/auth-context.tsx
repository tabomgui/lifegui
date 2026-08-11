import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, csrf } from '@/lib/api'

type User = { id: number; name: string; email: string; avatar: string | null }
type AuthCtx = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/me').then(r => setUser(r.data.data)).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    await csrf()
    const r = await api.post('/login', { email, password })
    setUser(r.data.data)
  }

  async function register(name: string, email: string, password: string, passwordConfirmation: string) {
    await csrf()
    const r = await api.post('/register', { name, email, password, password_confirmation: passwordConfirmation })
    setUser(r.data.data)
  }

  async function logout() {
    await api.post('/logout')
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}

export function useAuthContext() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuthContext deve estar dentro de AuthProvider')
  return ctx
}
