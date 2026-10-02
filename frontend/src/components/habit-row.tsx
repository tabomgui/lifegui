import { Archive, Flame, Minus, Pencil, Trash2, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Habit, HabitSummary } from '@/types/api'
import { useToggleHabit } from '@/hooks/use-habits'
import { useWeekDow } from '@/components/week-stepper'
import { DynamicIcon } from '@/components/icon'
import { ProgressRing } from '@/components/progress-ring'

export function HabitRow({
  habit, summary, week, onEdit, onDelete, onArchive,
}: {
  habit: Habit
  summary?: HabitSummary
  week: string
  onEdit: (h: Habit) => void
  onDelete: (h: Habit) => void
  onArchive: (h: Habit) => void
}) {
  const { t } = useTranslation(['habits', 'common'])
  const weekDow = useWeekDow()
  const toggle = useToggleHabit(week)
  const days = summary?.days ?? []
  const doneCount = summary?.done_count ?? 0
  const streak = summary?.streak ?? 0

  // Dia de hoje em data LOCAL (Y-m-d) — não dá pra marcar dias futuros.
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <div className="group flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 md:grid md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex items-center gap-3">
        <ProgressRing value={doneCount} max={habit.target_per_week} color={habit.color} showText={false} className="h-7 w-7" />
        <DynamicIcon name={habit.icon} className="h-5 w-5" style={{ color: habit.color }} />
        <div>
          <p className="text-sm font-medium">{habit.name}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {habit.target_per_week
              ? t('row.progressWithTarget', { done: doneCount, target: habit.target_per_week })
              : t('row.progressNoTarget', { done: doneCount })}
            {streak > 0 && <span className="inline-flex items-center gap-0.5"><Flame className="h-3 w-3 text-orange-500" /> {streak}</span>}
          </p>
        </div>
        <div className="ml-auto flex gap-1 opacity-100 transition-opacity md:ml-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <button onClick={() => onArchive(habit)} aria-label={t('row.archiveAria', { name: habit.name })} title={t('row.archive')} className="rounded p-1 hover:bg-accent"><Archive className="h-3.5 w-3.5" /></button>
          <button onClick={() => onEdit(habit)} aria-label={t('row.editAria', { name: habit.name })} title={t('common:actions.edit')} className="rounded p-1 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(habit)} aria-label={t('row.deleteAria', { name: habit.name })} title={t('common:actions.delete')} className="rounded p-1 hover:bg-accent"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="flex justify-between gap-1.5 md:justify-end">
        {days.map((d, i) => {
          const isFuture = d.date > todayStr
          const state = isFuture
            ? t('row.state.future')
            : d.done
              ? t('row.state.done')
              : d.skipped
                ? t('row.state.skipped')
                : t('row.state.notDone')
          return (
            <button key={d.date} disabled={isFuture}
              title={isFuture ? t('row.futureTitle', { date: d.date }) : t('row.dayTitle', { date: d.date, state })}
              aria-label={t('row.dayAria', { weekday: weekDow[i], date: d.date, state })}
              aria-pressed={d.done}
              onClick={() => toggle.mutate({ habitId: habit.id, date: d.date })}
              className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-colors ${
                isFuture
                  ? 'cursor-not-allowed border-dashed text-muted-foreground/30'
                  : d.done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : d.skipped
                      ? 'border-dashed border-amber-500/50 text-amber-400'
                      : 'text-muted-foreground hover:bg-accent'
              }`}>
              {d.done ? <Check className="h-4 w-4" /> : d.skipped ? <Minus className="h-4 w-4" /> : weekDow[i][0].toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
