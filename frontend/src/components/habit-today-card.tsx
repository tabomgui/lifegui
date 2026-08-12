import { Check, ChevronsRight, Flame, Sun } from 'lucide-react'
import type { Habit } from '@/types/api'
import { useHabitSummary, useToggleHabit } from '@/hooks/use-habits'
import { mondayOf } from '@/components/week-stepper'
import { DynamicIcon } from '@/components/icon'
import { ProgressRing } from '@/components/progress-ring'

// Data local (Y-m-d) de hoje — o card sempre olha para hoje, independente da
// semana navegada na grade.
function todayLocal(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export function HabitTodayCard({ habits }: { habits: Habit[] }) {
  const today = todayLocal()
  const week = mondayOf(new Date())
  const { data: summaries = [] } = useHabitSummary(week)
  const toggle = useToggleHabit(week)

  const rows = habits.map((h) => {
    const summary = summaries.find((s) => s.habit_id === h.id)
    const day = summary?.days.find((d) => d.date === today)
    return { habit: h, summary, done: !!day?.done, skipped: !!day?.skipped }
  })
  const doneN = rows.filter((r) => r.done).length
  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold">Hoje · {dateLabel}</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {doneN} de {habits.length} feitos
        </span>
      </div>

      {habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum hábito ativo. Adicione um abaixo.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map(({ habit, summary, done, skipped }) => {
            const streak = summary?.streak ?? 0
            const doneCount = summary?.done_count ?? 0
            return (
              <div
                key={habit.id}
                className={`flex items-center gap-3 rounded-md border p-2.5 ${done ? 'bg-muted/20' : 'bg-card'}`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ background: habit.color }}
                >
                  <DynamicIcon name={habit.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{habit.name}</p>
                  {skipped ? (
                    <p className="text-xs text-amber-400">pulado hoje · não quebra o streak</p>
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      {habit.target_per_week ? `meta ${habit.target_per_week}/sem` : 'sem meta'}
                      {streak > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" /> {streak}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {!skipped && (
                  <ProgressRing value={doneCount} max={habit.target_per_week} className="h-8 w-8" />
                )}
                <button
                  onClick={() => toggle.mutate({ habitId: habit.id, date: today, state: done ? 'none' : 'done' })}
                  aria-pressed={done}
                  aria-label={done ? `Desmarcar ${habit.name}` : `Marcar ${habit.name} como feito`}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                    done ? 'border-emerald-500 bg-emerald-500 text-white' : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Check className="h-5 w-5" />
                </button>
                {!done && (
                  <button
                    onClick={() =>
                      toggle.mutate({ habitId: habit.id, date: today, state: skipped ? 'none' : 'skip' })
                    }
                    aria-pressed={skipped}
                    title={skipped ? 'Desfazer pular' : 'Pular hoje'}
                    aria-label={skipped ? `Desfazer pular ${habit.name}` : `Pular ${habit.name} hoje`}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed ${
                      skipped ? 'border-amber-500/50 text-amber-400' : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Toggle grande = feito. Botão tracejado = pular (folga/viagem).
      </p>
    </div>
  )
}
