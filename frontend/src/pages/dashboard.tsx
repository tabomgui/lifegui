import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  const { user, logout } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold">Olá, {user?.name} 👋</h1>
      <p className="text-muted-foreground">Lifeboard — fundação pronta.</p>
      <Button variant="outline" onClick={logout}>Sair</Button>
    </div>
  )
}
