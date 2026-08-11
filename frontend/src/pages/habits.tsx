import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { HabitDialog } from '@/components/habit-dialog'
import { HabitRow } from '@/components/habit-row'
import { WeekStepper, WEEK_DOW, mondayOf } from '@/components/week-stepper'
import { useHabits, useHabitSummary, useDeleteHabit } from '@/hooks/use-habits'
import type { Habit } from '@/types/api'
import { toast } from 'sonner'

export default function Habits() {
  const [week, setWeek] = useState(() => mondayOf(new Date()))
  const { data: habits = [], isLoading } = useHabits()
  const { data: summaries = [] } = useHabitSummary(week)
  const del = useDeleteHabit()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)

  function openNew() { setEditing(null); setDialogOpen(true) }
  function openEdit(h: Habit) { setEditing(h); setDialogOpen(true) }
  async function remove(h: Habit) {
    if (!confirm(`Apagar o hábito "${h.name}"?`)) return
    try { await del.mutateAsync(h.id) } catch { toast.error('Não foi possível apagar') }
  }

  return (
    <AppLayout title="Hábitos">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-between">
            <WeekStepper week={week} onChange={setWeek} />
            <Button size="sm" onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Novo hábito</Button>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Hábito</span>
              <div className="flex gap-1.5">
                {WEEK_DOW.map((d) => <span key={d} className="w-8 text-center">{d}</span>)}
              </div>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : habits.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum hábito ainda. Crie o primeiro 👆</div>
            ) : (
              habits.map((h) => (
                <HabitRow key={h.id} habit={h} week={week}
                  summary={summaries.find((s) => s.habit_id === h.id)}
                  onEdit={openEdit} onDelete={remove} />
              ))
            )}
          </div>
        </div>
        <HabitDialog open={dialogOpen} onOpenChange={setDialogOpen} habit={editing} />
      </main>
    </AppLayout>
  )
}
