import { useMemo, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { CategoryTabs } from '@/components/category-tabs'
import type { TaskTab } from '@/components/category-tabs'
import { BrainDump } from '@/components/brain-dump'
import { KanbanBoard } from '@/components/kanban-board'
import { useTasks } from '@/hooks/use-tasks'
import { isOverdueOrToday } from '@/lib/due-date'
import type { Task } from '@/types/api'

// Normaliza para busca insensível a caixa/acentos.
function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function matchesSearch(task: Task, needle: string): boolean {
  if (!needle) return true
  const haystack = [task.title, task.notes ?? '', ...(task.subtasks ?? []).map((s) => s.title)]
  return haystack.some((h) => norm(h).includes(needle))
}

export default function Dashboard() {
  const { data: tasks = [], isLoading, isError } = useTasks()
  const [activeCat, setActiveCat] = useState<TaskTab>('all')
  const [search, setSearch] = useState('')

  const visible = useMemo(() => {
    const needle = norm(search.trim())
    return tasks.filter((t) => {
      const inTab =
        activeCat === 'all' ? true
          : activeCat === 'today' ? t.status !== 'done' && isOverdueOrToday(t.due_date)
            : t.category_id === activeCat
      return inTab && matchesSearch(t, needle)
    })
  }, [tasks, activeCat, search])

  return (
    <AppLayout title="Tarefas">
      <main className="flex min-h-0 flex-1 flex-col">
        <BrainDump activeCategoryId={typeof activeCat === 'number' ? activeCat : null} />
        <CategoryTabs active={activeCat} onChange={setActiveCat} search={search} onSearchChange={setSearch} />
        {isError
          ? <div className="flex flex-1 items-center justify-center text-muted-foreground">Não foi possível carregar as tarefas.</div>
          : isLoading
            ? <div className="flex flex-1 items-center justify-center text-muted-foreground">Carregando…</div>
            : <KanbanBoard tasks={visible} />}
      </main>
    </AppLayout>
  )
}
