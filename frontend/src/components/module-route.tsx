import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useModules, enabledSet } from '@/hooks/use-modules'
import type { ModuleInfo, ModuleKey } from '@/types/api'

// Rota canônica do primeiro módulo habilitado; /configuracoes se nenhum estiver ativo.
const MODULE_ROUTE: Record<ModuleKey, string> = {
  tasks: '/',
  habits: '/habits',
}

export function firstEnabledRoute(modules: ModuleInfo[] | undefined): string {
  const enabled = enabledSet(modules)
  for (const key of ORDER) {
    if (enabled.has(key)) return MODULE_ROUTE[key]
  }
  return '/configuracoes'
}

function ModulesLoading() {
  return (
    <div className="flex h-screen items-center justify-center text-muted-foreground">Carregando…</div>
  )
}

// Envolve rotas de módulo: aguarda o carregamento dos módulos (sem flash/redirect
// prematuro) e redireciona para o primeiro módulo habilitado se este estiver desativado.
export function ModuleRoute({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { data, isLoading, isError } = useModules()
  if (isLoading) return <ModulesLoading />
  // Em erro (ex.: falha de rede), não redirecionamos em cascata: mostramos o conteúdo
  // e deixamos a própria página tratar o erro da sua API.
  if (!isError && !enabledSet(data).has(module)) {
    return <Navigate to={firstEnabledRoute(data)} replace />
  }
  return <>{children}</>
}

// Rota índice: Tarefas quando habilitado, senão o primeiro módulo habilitado.
export function IndexRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useModules()
  if (isLoading) return <ModulesLoading />
  if (!isError && !enabledSet(data).has('tasks')) {
    return <Navigate to={firstEnabledRoute(data)} replace />
  }
  return <>{children}</>
}

// Rota de relatórios: só faz sentido com tarefas ou hábitos habilitados.
export function ReportsRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useModules()
  if (isLoading) return <ModulesLoading />
  const enabled = enabledSet(data)
  if (!isError && !enabled.has('tasks') && !enabled.has('habits')) {
    return <Navigate to={firstEnabledRoute(data)} replace />
  }
  return <>{children}</>
}
