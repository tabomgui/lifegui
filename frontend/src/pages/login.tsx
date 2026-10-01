import { useEffect, useState } from 'react'
import { useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom'
import type * as React from 'react'
import axios from 'axios'
import { useAuth } from '@/hooks/use-auth'
import { useSetupStatus } from '@/hooks/use-setup-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function Login() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const { data: status, isLoading: statusLoading } = useSetupStatus()
  const [params, setParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // O callback do Google volta com ?error=registration_closed para email sem conta.
  useEffect(() => {
    if (params.get('error') !== 'registration_closed') return
    toast.error('Esta conta Google não está cadastrada nesta instância.')
    params.delete('error')
    setParams(params, { replace: true })
  }, [params, setParams])

  // Já autenticado: não faz sentido ficar na tela de login.
  if (!loading && user) return <Navigate to="/" replace />
  // Evita flash do formulário (Google/cadastro aparecendo e sumindo) antes de saber o status da instância.
  if (statusLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>
  }
  if (status?.needs_setup) return <Navigate to="/setup" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast.error(message ?? 'Credenciais inválidas')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="lifegui" className="h-8 w-8 rounded-md" />
          <h1 className="text-lg font-semibold">Entrar no lifegui</h1>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>Entrar</Button>
        {status?.google_login_enabled && (
          <a href="/api/auth/google/redirect" className="block w-full rounded-md border py-2 text-center text-sm hover:bg-accent">
            Entrar com Google
          </a>
        )}
        {status?.registration_enabled && (
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta? <Link to="/register" className="underline">Cadastre-se</Link>
          </p>
        )}
      </form>
    </div>
  )
}
