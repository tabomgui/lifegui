import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Kanban, Repeat, Brain, CalendarDays, BarChart3, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useEnabledModules, useModules } from '@/hooks/use-modules'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { useOnboarding } from '@/contexts/onboarding-context'
import { firstEnabledRoute } from '@/components/module-route'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

type NavItem = {
  to: string
  end?: boolean
  label: string
  icon: typeof Kanban
  show: boolean
}

function isRouteActive(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

function AppSidebar() {
  const { user, logout } = useAuth()
  const { isEnabled } = useEnabledModules()
  const { isMobile, setOpenMobile } = useSidebar()
  const location = useLocation()
  const showReports = isEnabled('tasks') || isEnabled('habits') || isEnabled('brain')

  function handleNavigate() {
    if (isMobile) setOpenMobile(false)
  }

  const items: NavItem[] = [
    { to: '/', end: true, label: 'Tarefas', icon: Kanban, show: isEnabled('tasks') },
    { to: '/habits', label: 'Hábitos', icon: Repeat, show: isEnabled('habits') },
    { to: '/cerebro', label: 'Cérebro', icon: Brain, show: isEnabled('brain') },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays, show: true },
    { to: '/dashboards', label: 'Dashboards', icon: BarChart3, show: showReports },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2 px-2">
          <img src="/favicon.svg" alt="lifegui" className="h-7 w-7 shrink-0 rounded-md" />
          <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            lifegui
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter((item) => item.show)
                .map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isRouteActive(location.pathname, item.to, item.end)}
                      tooltip={item.label}
                    >
                      <NavLink to={item.to} end={item.end} onClick={handleNavigate}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isRouteActive(location.pathname, '/configuracoes')}
              tooltip="Configurações"
            >
              <NavLink to="/configuracoes" onClick={handleNavigate}>
                <Settings />
                <span>Configurações</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>Sair</Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
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
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <h1 className="flex-1 text-base font-semibold tracking-tight">{title}</h1>
          <ModeToggle />
        </header>
        {children}
      </SidebarInset>
      <OnboardingGate />
    </SidebarProvider>
  )
}
