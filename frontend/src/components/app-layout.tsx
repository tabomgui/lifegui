import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Kanban, Repeat, Brain, CalendarDays, BarChart3, Settings, BookOpen, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useEnabledModules, useModules } from '@/hooks/use-modules'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { useOnboarding } from '@/contexts/onboarding-context'
import { firstEnabledRoute } from '@/components/module-route'
import { docsUrl } from '@/lib/docs'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  }`

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const { isEnabled } = useEnabledModules()
  const showReports = isEnabled('tasks') || isEnabled('habits') || isEnabled('brain')
  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <img src="/favicon.svg" alt="lifegui" className="h-7 w-7 rounded-md" />
        <span className="text-sm font-semibold tracking-tight">lifegui</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {isEnabled('tasks') && (
          <NavLink to="/" end className={navClass} onClick={onNavigate}>
            <Kanban className="h-4 w-4" /> Tarefas
          </NavLink>
        )}
        {isEnabled('habits') && (
          <NavLink to="/habits" className={navClass} onClick={onNavigate}>
            <Repeat className="h-4 w-4" /> Hábitos
          </NavLink>
        )}
        {isEnabled('brain') && (
          <NavLink to="/cerebro" className={navClass} onClick={onNavigate}>
            <Brain className="h-4 w-4" /> Cérebro
          </NavLink>
        )}
        <NavLink to="/agenda" className={navClass} onClick={onNavigate}>
          <CalendarDays className="h-4 w-4" /> Agenda
        </NavLink>
        {showReports && (
          <NavLink to="/dashboards" className={navClass} onClick={onNavigate}>
            <BarChart3 className="h-4 w-4" /> Dashboards
          </NavLink>
        )}
        <div className="mt-auto" />
        <a href={docsUrl()} target="_blank" rel="noreferrer" className={navClass({ isActive: false })}>
          <BookOpen className="h-4 w-4" /> Documentação
        </a>
        <NavLink to="/configuracoes" className={navClass} onClick={onNavigate}>
          <Settings className="h-4 w-4" /> Configurações
        </NavLink>
      </nav>
      <div className="border-t p-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="truncate text-sm">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>Sair</Button>
        </div>
      </div>
    </>
  )
}

// Abre o wizard enquanto a conta não concluiu o primeiro uso, ou quando reaberto
// em Configurações. Concluir/pular grava onboarded_at só no primeiro caso.
function OnboardingGate() {
  const { user, completeOnboarding } = useAuth()
  const { replaying, endReplay } = useOnboarding()
  const { data: modules } = useModules()
  const navigate = useNavigate()
  const pending = !!user && user.onboarded_at === null

  async function finish() {
    if (pending) {
      await completeOnboarding()
      navigate(firstEnabledRoute(modules))
    }
    endReplay()
  }

  return <OnboardingWizard open={pending || replaying} onFinish={finish} />
}

export function AppLayout({ children, title }: { children: ReactNode; title: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* sidebar fixa (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 md:flex">
        <SidebarContent />
      </aside>

      {/* drawer (mobile) */}
      <div className={`fixed inset-0 z-50 md:hidden ${menuOpen ? '' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-background shadow-xl transition-transform ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            className="absolute right-2 top-3 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="-ml-1 rounded-md p-1.5 hover:bg-accent md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-base font-semibold tracking-tight">{title}</h1>
          <ModeToggle />
        </header>
        {children}
      </div>
      <OnboardingGate />
    </div>
  )
}
