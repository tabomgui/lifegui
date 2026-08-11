import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type * as React from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/')
    } catch {
      toast.error('Credenciais inválidas')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Entrar no lifeboard</h1>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full">Entrar</Button>
        <a href="/api/auth/google/redirect" className="block w-full rounded-md border py-2 text-center text-sm hover:bg-accent">
          Entrar com Google
        </a>
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta? <Link to="/register" className="underline">Cadastre-se</Link>
        </p>
      </form>
    </div>
  )
}
