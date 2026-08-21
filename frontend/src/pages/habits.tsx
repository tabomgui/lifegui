import { useState } from 'react'
import { Plus, Archive, RotateCcw } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { HabitDialog } from '@/components/habit-dialog'
import { HabitRow } from '@/components/habit-row'
import { HabitTodayCard } from '@/components/habit-today-card'
import { WeekStepper, WEEK_DOW, mondayOf } from '@/components/week-stepper'
import {
  useHabits,
  useHabitSummary,
  useDeleteHabit,
  useArchiveHabit,
  useUnarchiveHabit,
} from '@/hooks/use-habits'
import { DynamicIcon } from '@/components/icon'
import type { Habit } from '@/types/api'
import { toast } from 'sonner'

export default function Habits() {
  const [week, setWeek] = useState(() => mondayOf(new Date()))
  const { data: habits = [], isLoading } = useHabits()
  const { data: summaries = [] } = useHabitSummary(week)
  const del = useDeleteHabit()
  const archive = useArchiveHabit()
  const unarchive = useUnarchiveHabit()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const { data: archived = [] } = useHabits(true, showArchived)

  function openNew() { setEditing(null); setDialogOpen(true) }
  function openEdit(h: Habit) { setEditing(h); setDialogOpen(true) }

  async function remove(h: Habit) {
    if (!confirm(`Apagar o hábito "${h.name}"?`)) return
    try { await del.mutateAsync(h.id) } catch { toast.error('Não foi possível apagar') }
  }

  async function onArchive(h: Habit) {
    try { await archive.mutateAsync(h.id); toast.success(`"${h.name}" arquivado`) }
    catch { toast.error('Não foi possível arquivar') }
  }

  async function onRestore(h: Habit) {
    try { await unarchive.mutateAsync(h.id); toast.success(`"${h.name}" restaurado`) }
    catch { toast.error('Não foi possível restaurar') }
  }

  return (
    <AppLayout title="Hábitos">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <HabitTodayCard habits={habits} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <WeekStepper week={week} onChange={setWeek} />
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo hábito
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Hábito <span className="text-muted-foreground/60">· semana</span></span>
              <div className="hidden gap-1.5 md:flex">
                {WEEK_DOW.map((d) => <span key={d} className="w-8 text-center">{d}</span>)}
              </div>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : habits.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum hábito ainda. Crie o primeiro acima.</div>
            ) : (
              habits.map((h) => (
                <HabitRow key={h.id} habit={h} week={week}
                  summary={summaries.find((s) => s.habit_id === h.id)}
                  onEdit={openEdit} onDelete={remove} onArchive={onArchive} />
              ))
            )}
          </div>

          <div>
            <button
              onClick={() => setShowArchived((v) => !v)}
              aria-expanded={showArchived}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Archive className="h-3.5 w-3.5" /> Arquivados
            </button>
            {showArchived && (
              <div className="mt-2 space-y-1 rounded-lg border bg-card/40 p-3">
                {archived.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum hábito arquivado.</p>
                ) : (
                  archived.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                      <DynamicIcon name={h.icon} className="h-4 w-4 shrink-0" style={{ color: h.color }} />
                      <span className="flex-1 truncate text-sm">{h.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => onRestore(h)}>
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <HabitDialog open={dialogOpen} onOpenChange={setDialogOpen} habit={editing} />
      </main>
    </AppLayout>
  )
}
