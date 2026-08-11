import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type * as React from 'react'
import axios from 'axios'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await register(form.name, form.email, form.password, form.confirm)
      navigate('/')
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast.error(message ?? 'Não foi possível cadastrar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Criar conta</h1>
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input id="confirm" type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>Cadastrar</Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="underline">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
