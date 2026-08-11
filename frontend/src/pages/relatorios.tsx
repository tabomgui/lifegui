import { useMemo, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { TaskHeatmap } from '@/components/task-heatmap'
import { HabitRadar } from '@/components/habit-radar'
import { PeriodFilter, rangeForDays, PERIODS } from '@/components/period-filter'
import { useTaskHeatmap } from '@/hooks/use-heatmap'
import { useHabitStats } from '@/hooks/use-habit-stats'

function daysForKey(key: string): number {
  return (PERIODS.find((p) => p.key === key) ?? PERIODS[1]).days
}

export default function Relatorios() {
  const [heatmapPeriod, setHeatmapPeriod] = useState<string>('365d')
  const [habitPeriod, setHabitPeriod] = useState<string>('30d')

  const heatmapRange = useMemo(() => rangeForDays(daysForKey(heatmapPeriod)), [heatmapPeriod])
  const habitRange = useMemo(() => rangeForDays(daysForKey(habitPeriod)), [habitPeriod])

  const { data, isPending } = useTaskHeatmap(heatmapRange.from, heatmapRange.to)
  const { data: habitStats, isPending: habitsPending } = useHabitStats(habitRange.from, habitRange.to)

  return (
    <AppLayout title="Relatórios">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Atividade de tarefas</h2>
              <PeriodFilter value={heatmapPeriod} onChange={setHeatmapPeriod} />
            </div>
            <p className="mb-4 text-xs text-muted-foreground">últimos {daysForKey(heatmapPeriod)} dias</p>
            {isPending || !data ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (
              <TaskHeatmap data={data} />
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Aderência aos hábitos</h2>
              <PeriodFilter value={habitPeriod} onChange={setHabitPeriod} />
            </div>
            <p className="mb-4 text-xs text-muted-foreground">últimos {daysForKey(habitPeriod)} dias</p>
            {habitsPending || !habitStats ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (
              <HabitRadar habits={habitStats.habits} />
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
