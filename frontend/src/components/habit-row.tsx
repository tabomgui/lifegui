import { Flame, Pencil, Trash2 } from 'lucide-react'
import type { Habit, HabitSummary } from '@/types/api'
import { useToggleHabit } from '@/hooks/use-habits'
import { WEEK_DOW } from '@/components/week-stepper'

export function HabitRow({
  habit, summary, week, onEdit, onDelete,
}: {
  habit: Habit
  summary?: HabitSummary
  week: string
  onEdit: (h: Habit) => void
  onDelete: (h: Habit) => void
}) {
  const toggle = useToggleHabit(week)
  const days = summary?.days ?? []
  const doneCount = summary?.done_count ?? 0
  const streak = summary?.streak ?? 0

  return (
    <div className="group grid grid-cols-[1fr_auto] items-center gap-2 border-b px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{habit.emoji}</span>
        <div>
          <p className="text-sm font-medium">{habit.name}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {habit.target_per_week ? `${doneCount}/${habit.target_per_week} esta semana` : `${doneCount} esta semana`}
            {streak > 0 && <span className="inline-flex items-center gap-0.5"><Flame className="h-3 w-3 text-orange-500" /> {streak}</span>}
          </p>
        </div>
        <div className="ml-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button onClick={() => onEdit(habit)} aria-label={`Editar ${habit.name}`} title="Editar" className="rounded p-1 hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(habit)} aria-label={`Apagar ${habit.name}`} title="Apagar" className="rounded p-1 hover:bg-accent"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {days.map((d, i) => (
          <button key={d.date} title={d.date} aria-label={`${WEEK_DOW[i]} ${d.date} ${d.done ? 'feito' : 'não feito'}`}
            aria-pressed={d.done}
            onClick={() => toggle.mutate({ habitId: habit.id, date: d.date })}
            className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-colors ${d.done ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
            {d.done ? '✓' : WEEK_DOW[i][0]}
          </button>
        ))}
      </div>
    </div>
  )
}
