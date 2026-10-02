import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import type * as React from 'react'
import axios from 'axios'
import { UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/use-auth'
import { useSetupStatus } from '@/hooks/use-setup-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function Register() {
  const { t } = useTranslation(['auth', 'common'])
  const { register, user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)
  const { data: status, isLoading } = useSetupStatus()

  // Já autenticado: não faz sentido ficar na tela de cadastro.
  if (!loading && user) return <Navigate to="/" replace />
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t('common:states.loading')}</div>
  }
  if (status?.needs_setup) return <Navigate to="/setup" replace />
  if (status && !status.registration_enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-3 rounded-lg border bg-card p-6 text-center">
          <UserX className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t('register.disabled.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('register.disabled.description')}
          </p>
          <Link to="/login" className="text-sm underline">{t('register.disabled.backToLogin')}</Link>
        </div>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await register(form.name, form.email, form.password, form.confirm)
      navigate('/')
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast.error(message ?? t('register.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">{t('register.title')}</h1>
        <div className="space-y-2">
          <Label htmlFor="name">{t('fields.name')}</Label>
          <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('fields.email')}</Label>
          <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('fields.password')}</Label>
          <Input id="password" type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t('fields.confirmPassword')}</Label>
          <Input id="confirm" type="password" minLength={8} value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>{t('register.submit')}</Button>
        <p className="text-center text-sm text-muted-foreground">
          {t('register.haveAccount')} <Link to="/login" className="underline">{t('register.loginLink')}</Link>
        </p>
      </form>
    </div>
  )
}
