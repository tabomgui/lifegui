import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, csrf } from '@/lib/api'
import i18n from '@/i18n'
import { isLocale, type Locale } from '@/i18n/types'

type User = {
  id: number
  name: string
  email: string
  avatar: string | null
  onboarded_at: string | null
  locale: Locale
}
type AuthCtx = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>
  setup: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>
  completeOnboarding: () => Promise<void>
  setLocale: (locale: Locale) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Idioma da conta vence o do navegador assim que o usuário é conhecido.
  function applyUser(next: User | null) {
    setUser(next)
    if (next && isLocale(next.locale) && i18n.language !== next.locale) {
      void i18n.changeLanguage(next.locale)
    }
  }

  useEffect(() => {
    api.get('/me').then(r => applyUser(r.data.data)).catch(() => applyUser(null)).finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    await csrf()
    const r = await api.post('/login', { email, password })
    applyUser(r.data.data)
  }

  async function register(name: string, email: string, password: string, passwordConfirmation: string) {
    await csrf()
    const r = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
      locale: i18n.language,
    })
    applyUser(r.data.data)
  }

  // Primeira conta da instância (POST /setup só funciona sem usuários).
  async function setup(name: string, email: string, password: string, passwordConfirmation: string) {
    await csrf()
    const r = await api.post('/setup', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
      locale: i18n.language,
    })
    applyUser(r.data.data)
  }

  async function completeOnboarding() {
    await csrf()
    const r = await api.post('/onboarding/complete')
    applyUser(r.data.data)
  }

  async function setLocale(locale: Locale) {
    await csrf()
    const r = await api.patch('/me', { locale })
    applyUser(r.data.data)
  }

  async function logout() {
    await api.post('/logout')
    applyUser(null)
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, setup, completeOnboarding, setLocale, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuthContext deve estar dentro de AuthProvider')
  return ctx
}
