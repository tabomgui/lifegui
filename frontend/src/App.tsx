import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/login'
import Register from '@/pages/register'
import Dashboard from '@/pages/dashboard'
import Habits from '@/pages/habits'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Backend (Google callback) redireciona para /dashboard; o dashboard vive em /. */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/habits" element={<Habits />} />
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
