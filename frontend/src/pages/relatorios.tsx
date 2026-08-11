import { AppLayout } from '@/components/app-layout'
import { TaskHeatmap } from '@/components/task-heatmap'
import { useTaskHeatmap } from '@/hooks/use-heatmap'

export default function Relatorios() {
  const { data, isPending } = useTaskHeatmap()

  return (
    <AppLayout title="Relatórios">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold tracking-tight">Atividade de tarefas</h2>
            {isPending || !data ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (
              <TaskHeatmap data={data} />
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
