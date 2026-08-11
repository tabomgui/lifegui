import { useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { CategoryTabs } from '@/components/category-tabs'
import { BrainDump } from '@/components/brain-dump'
import { KanbanBoard } from '@/components/kanban-board'
import { useTasks } from '@/hooks/use-tasks'

export default function Dashboard() {
  const { data: tasks = [], isLoading, isError } = useTasks()
  const [activeCat, setActiveCat] = useState<number | 'all'>('all')

  const visible = activeCat === 'all' ? tasks : tasks.filter((t) => t.category_id === activeCat)

  return (
    <AppLayout title="Tarefas">
      <main className="flex min-h-0 flex-1 flex-col">
        <BrainDump activeCategoryId={activeCat === 'all' ? null : activeCat} />
        <CategoryTabs active={activeCat} onChange={setActiveCat} />
        {isError
          ? <div className="flex flex-1 items-center justify-center text-muted-foreground">Não foi possível carregar as tarefas.</div>
          : isLoading
            ? <div className="flex flex-1 items-center justify-center text-muted-foreground">Carregando…</div>
            : <KanbanBoard tasks={visible} />}
      </main>
    </AppLayout>
  )
}
