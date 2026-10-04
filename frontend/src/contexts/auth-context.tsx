import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  timezone: string
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
  const queryClient = useQueryClient()
  const syncingTimezone = useRef(false)

  // Idioma da conta vence o do navegador assim que o usuário é conhecido.
  function applyUser(next: User | null) {
    setUser(next)
    if (next && isLocale(next.locale) && i18n.language !== next.locale) {
      void i18n.changeLanguage(next.locale)
    }
    if (next) void syncTimezone(next)
  }

  // Fuso vem do navegador: o servidor usa pra saber qual é o "hoje" do usuário
  // (streak, MCP, datas de notas). Falha silenciosa: tenta de novo no próximo load.
  async function syncTimezone(current: User) {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!browserTz || current.timezone === browserTz || syncingTimezone.current) return
    syncingTimezone.current = true
    try {
      await csrf()
      const r = await api.patch('/me', { timezone: browserTz })
      setUser(r.data.data)
      // Agregações do servidor dependem do "hoje" do usuário.
      void queryClient.invalidateQueries()
    } catch {
      // ignora
    } finally {
      syncingTimezone.current = false
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
    // Dados do servidor localizados (ex.: labels de módulos) precisam ser refeitos no novo idioma;
    // não espera terminar pra não atrasar o toast de sucesso de quem chamou setLocale.
    void queryClient.invalidateQueries()
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
