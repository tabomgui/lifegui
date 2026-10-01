import { useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateHabit, useHabits } from '@/hooks/use-habits'
import { DynamicIcon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import { StepHeader } from '@/components/onboarding/step-header'
import { HABIT_SUGGESTIONS, nameKey, type HabitSuggestion } from '@/components/onboarding/suggestions'

export function HabitsStep() {
  const { data: habits = [], isSuccess } = useHabits()
  const create = useCreateHabit()
  const [targets, setTargets] = useState<Record<string, number>>(() =>
    Object.fromEntries(HABIT_SUGGESTIONS.map((s) => [s.name, s.target_per_week])),
  )
  const existing = new Set(habits.map((h) => nameKey(h.name)))

  function adjust(name: string, delta: number) {
    setTargets((t) => ({ ...t, [name]: Math.min(7, Math.max(1, t[name] + delta)) }))
  }

  async function add(s: HabitSuggestion) {
    try {
      await create.mutateAsync({ name: s.name, icon: s.icon, color: s.color, target_per_week: targets[s.name] })
    } catch {
      toast.error(`Não foi possível criar "${s.name}"`)
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader title="Hábitos" description="Escolha alguns para começar e ajuste a meta semanal." />
      <div className="space-y-2">
        {HABIT_SUGGESTIONS.map((s) => {
          const added = existing.has(nameKey(s.name))
          return (
            <div key={s.name} className="flex items-center gap-3 rounded-lg border p-3">
              <DynamicIcon name={s.icon} className="h-4 w-4 shrink-0" style={{ color: s.color }} />
              <span className="flex-1 text-sm font-medium">{s.name}</span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Diminuir meta"
                  disabled={added || targets[s.name] <= 1}
                  onClick={() => adjust(s.name, -1)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-14 text-center text-xs tabular-nums text-muted-foreground">
                  {targets[s.name]}x/sem
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Aumentar meta"
                  disabled={added || targets[s.name] >= 7}
                  onClick={() => adjust(s.name, 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {added ? (
                <span className="inline-flex w-24 items-center justify-end gap-1 text-xs text-primary">
                  <Check className="h-3.5 w-3.5" /> Adicionado
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-24"
                  disabled={create.isPending || !isSuccess}
                  onClick={() => add(s)}
                >
                  Adicionar
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
