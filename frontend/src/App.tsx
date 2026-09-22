import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { ModuleRoute, IndexRoute, ReportsRoute } from '@/components/module-route'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/login'
import Register from '@/pages/register'
import Dashboard from '@/pages/dashboard'
import Habits from '@/pages/habits'
import Cerebro from '@/pages/cerebro'
import Relatorios from '@/pages/relatorios'
import Configuracoes from '@/pages/configuracoes'

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
            <Route path="/" element={<IndexRoute><Dashboard /></IndexRoute>} />
            <Route path="/habits" element={<ModuleRoute module="habits"><Habits /></ModuleRoute>} />
            <Route path="/cerebro" element={<ModuleRoute module="brain"><Cerebro /></ModuleRoute>} />
            <Route path="/relatorios" element={<ReportsRoute><Relatorios /></ReportsRoute>} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
