import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute() {
  const { t } = useTranslation('common')
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">{t('states.loading')}</div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
