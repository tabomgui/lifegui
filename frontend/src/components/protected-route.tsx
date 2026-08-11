import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Carregando…</div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
