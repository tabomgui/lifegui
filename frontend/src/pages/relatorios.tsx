import { useMemo, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { TaskHeatmap } from '@/components/task-heatmap'
import { HabitRadar } from '@/components/habit-radar'
import { useTaskHeatmap } from '@/hooks/use-heatmap'
import { useHabitStats } from '@/hooks/use-habit-stats'

// Parse/format 'Y-m-d' as LOCAL dates (avoid `new Date('Y-m-d')`/`toISOString`,
// which are UTC-based and can be off by a day).
function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const PRESETS = [
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: '90d', label: '90 dias', days: 90 },
  { key: '1y', label: '1 ano', days: 365 },
] as const

type PresetKey = (typeof PRESETS)[number]['key']

export default function Relatorios() {
  const { data, isPending } = useTaskHeatmap()

  const [preset, setPreset] = useState<PresetKey>('30d')

  const { from, to, days } = useMemo(() => {
    const active = PRESETS.find((p) => p.key === preset) ?? PRESETS[1]
    const today = new Date()
    const start = addDays(today, -(active.days - 1))
    return { from: formatLocalDate(start), to: formatLocalDate(today), days: active.days }
  }, [preset])

  const { data: habitStats, isPending: habitsPending } = useHabitStats(from, to)

  return (
    <AppLayout title="Relatórios">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-4 text-sm font-semibold tracking-tight">Atividade de tarefas</h2>
            {isPending || !data ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : (
              <TaskHeatmap data={data} />
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Aderência aos hábitos</h2>
              <div className="flex gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      preset === p.key ? 'bg-secondary text-secondary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">últimos {days} dias</p>
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
