import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutGrid, Kanban, Repeat } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

export function AppLayout({ children, title }: { children: ReactNode; title: string }) {
  const { user, logout } = useAuth()
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">lifeboard</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          <NavLink to="/" end className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`
          }>
            <Kanban className="h-4 w-4" /> Tarefas
          </NavLink>
          <NavLink to="/habits" className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`
          }>
            <Repeat className="h-4 w-4" /> Hábitos
          </NavLink>
        </nav>
        <div className="border-t p-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="truncate text-sm">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>Sair</Button>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b px-4 md:px-6">
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        </header>
        {children}
      </div>
    </div>
  )
}
