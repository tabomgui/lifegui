import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type * as React from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await register(form.name, form.email, form.password, form.confirm)
      navigate('/')
    } catch {
      toast.error('Não foi possível cadastrar')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Criar conta</h1>
        <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Senha</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Confirmar senha</Label><Input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required /></div>
        <Button type="submit" className="w-full">Cadastrar</Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="underline">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
