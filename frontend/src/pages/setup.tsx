import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type * as React from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/use-auth'
import { SETUP_STATUS_KEY, useSetupStatus } from '@/hooks/use-setup-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Setup() {
  const { t } = useTranslation(['auth', 'common'])
  const { setup, user, loading } = useAuth()
  const { data: status, isLoading } = useSetupStatus()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)

  // Já autenticado: não faz sentido ficar na tela de setup.
  if (!loading && user) return <Navigate to="/" replace />
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t('common:states.loading')}</div>
  }
  if (status && !status.needs_setup) return <Navigate to="/login" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await setup(form.name, form.email, form.password, form.confirm)
      // Navega antes de invalidar: o status novo (needs_setup=false) mandaria pro login.
      navigate('/')
      qc.invalidateQueries({ queryKey: SETUP_STATUS_KEY })
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast.error(message ?? t('setup.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="lifegui" className="h-8 w-8 rounded-md" />
            <h1 className="text-lg font-semibold">{t('setup.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t('setup.description')}</p>
        </div>
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
        <Button type="submit" className="w-full" disabled={submitting}>{t('setup.submit')}</Button>
      </form>
    </div>
  )
}
