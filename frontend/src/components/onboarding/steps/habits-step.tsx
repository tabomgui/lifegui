import { useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCreateHabit, useHabits } from '@/hooks/use-habits'
import { DynamicIcon } from '@/components/icon'
import { Button } from '@/components/ui/button'
import { StepHeader } from '@/components/onboarding/step-header'
import { HABIT_SUGGESTIONS, nameKey, type HabitSuggestion } from '@/components/onboarding/suggestions'

export function HabitsStep() {
  const { t } = useTranslation(['onboarding'])
  const { data: habits = [], isSuccess } = useHabits()
  const create = useCreateHabit()
  // Estado indexado pela key estável da sugestão, não pelo nome traduzido (que muda com o idioma).
  const [targets, setTargets] = useState<Record<string, number>>(() =>
    Object.fromEntries(HABIT_SUGGESTIONS.map((s) => [s.key, s.target_per_week])),
  )
  const existing = new Set(habits.map((h) => nameKey(h.name)))

  function adjust(key: string, delta: number) {
    setTargets((prev) => ({ ...prev, [key]: Math.min(7, Math.max(1, prev[key] + delta)) }))
  }

  async function add(s: HabitSuggestion, name: string) {
    try {
      await create.mutateAsync({ name, icon: s.icon, color: s.color, target_per_week: targets[s.key] })
    } catch {
      toast.error(t('errors.createFailed', { name }))
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader title={t('habits.title')} description={t('habits.description')} />
      <div className="space-y-2">
        {HABIT_SUGGESTIONS.map((s) => {
          // Nome traduzido é o valor enviado à API e a base da comparação de "já adicionado".
          const name = t(`suggestions.habits.${s.key}`)
          const added = existing.has(nameKey(name))
          return (
            <div key={s.key} className="flex items-center gap-3 rounded-lg border p-3">
              <DynamicIcon name={s.icon} className="h-4 w-4 shrink-0" style={{ color: s.color }} />
              <span className="flex-1 text-sm font-medium">{name}</span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={t('habits.decreaseTarget')}
                  disabled={added || targets[s.key] <= 1}
                  onClick={() => adjust(s.key, -1)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-14 text-center text-xs tabular-nums text-muted-foreground">
                  {t('habits.timesPerWeek', { count: targets[s.key] })}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={t('habits.increaseTarget')}
                  disabled={added || targets[s.key] >= 7}
                  onClick={() => adjust(s.key, 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {added ? (
                <span className="inline-flex w-24 items-center justify-end gap-1 text-xs text-primary">
                  <Check className="h-3.5 w-3.5" /> {t('habits.added')}
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-24"
                  disabled={create.isPending || !isSuccess}
                  onClick={() => add(s, name)}
                >
                  {t('actions.add')}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
