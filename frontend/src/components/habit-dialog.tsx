import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateHabit, useUpdateHabit } from '@/hooks/use-habits'
import { HABIT_ICONS, DynamicIcon } from '@/components/icon'
import { NoteLinksSection } from '@/components/brain/note-link-picker'
import { ScheduleSection } from '@/components/calendar/schedule-section'
import type { Habit } from '@/types/api'
import { toast } from 'sonner'

const ICONS = HABIT_ICONS
const COLORS = ['#64748b', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
const DEFAULT_ICON = 'circle-check'

export function HabitDialog({
  open, onOpenChange, habit,
}: { open: boolean; onOpenChange: (o: boolean) => void; habit?: Habit | null }) {
  const create = useCreateHabit()
  const update = useUpdateHabit()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(DEFAULT_ICON)
  const [color, setColor] = useState(COLORS[0])
  const [target, setTarget] = useState<string>('')

  useEffect(() => {
    if (open) {
      setName(habit?.name ?? '')
      setIcon(habit?.icon ?? DEFAULT_ICON)
      setColor(habit?.color ?? COLORS[0])
      setTarget(habit?.target_per_week ? String(habit.target_per_week) : '')
    }
  }, [open, habit])

  async function onSave() {
    if (!name.trim()) return toast.error('Dê um nome ao hábito')
    // Trata vazio ou 0 como "sem meta"; o backend só aceita 1..7.
    const parsed = Number(target)
    const target_per_week = target && parsed >= 1 ? parsed : null
    try {
      if (habit) await update.mutateAsync({ id: habit.id, name, icon, color, target_per_week })
      else await create.mutateAsync({ name, icon, color, target_per_week })
      onOpenChange(false)
    } catch {
      toast.error('Não foi possível salvar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{habit ? 'Editar' : 'Novo'} hábito</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave() }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="habit-name">Nome</Label>
            <Input id="habit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="habit-target">Meta semanal (opcional, 1–7)</Label>
            <Input id="habit-target" type="number" min={1} max={7} value={target}
              onChange={(e) => setTarget(e.target.value)} placeholder="sem meta" />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICONS.map((i) => (
                <button key={i} type="button" onClick={() => setIcon(i)} aria-label={i} aria-pressed={icon === i}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border ${icon === i ? 'border-foreground bg-accent' : 'border-transparent hover:bg-accent'}`}>
                  <DynamicIcon name={i} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          {habit && <NoteLinksSection type="habit" id={habit.id} links={habit.note_links ?? []} />}
          {habit && (
            <ScheduleSection type="habit" refId={String(habit.id)} title={habit.name} defaultRecurring />
          )}
          <DialogFooter className="mt-2">
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
