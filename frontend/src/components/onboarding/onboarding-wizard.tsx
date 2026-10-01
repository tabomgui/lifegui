import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useEnabledModules } from '@/hooks/use-modules'
import { cn } from '@/lib/utils'
import { WelcomeStep } from '@/components/onboarding/steps/welcome-step'
import { ModulesStep } from '@/components/onboarding/steps/modules-step'
import { CategoriesStep } from '@/components/onboarding/steps/categories-step'
import { HabitsStep } from '@/components/onboarding/steps/habits-step'
import { IntegrationsStep } from '@/components/onboarding/steps/integrations-step'
import { DoneStep } from '@/components/onboarding/steps/done-step'

type StepKey = 'welcome' | 'modules' | 'categories' | 'habits' | 'integrations' | 'done'

const STEPS: Record<StepKey, { label: string; component: ComponentType }> = {
  welcome: { label: 'Início', component: WelcomeStep },
  modules: { label: 'Módulos', component: ModulesStep },
  categories: { label: 'Categorias', component: CategoriesStep },
  habits: { label: 'Hábitos', component: HabitsStep },
  integrations: { label: 'Integrações', component: IntegrationsStep },
  done: { label: 'Pronto', component: DoneStep },
}

// O passo atual sobrevive a navegações de página inteira (ex.: OAuth do Google Calendar).
const STORAGE_KEY = 'lifegui:onboarding-step'

export function OnboardingWizard({ open, onFinish }: { open: boolean; onFinish: () => Promise<void> }) {
  const { isEnabled } = useEnabledModules()
  const tasksOn = isEnabled('tasks')
  const habitsOn = isEnabled('habits')
  const steps = useMemo<StepKey[]>(
    () => [
      'welcome',
      'modules',
      ...(tasksOn ? (['categories'] as const) : []),
      ...(habitsOn ? (['habits'] as const) : []),
      'integrations',
      'done',
    ],
    [tasksOn, habitsOn],
  )
  const [current, setCurrent] = useState<StepKey>(
    () => (sessionStorage.getItem(STORAGE_KEY) as StepKey | null) ?? 'welcome',
  )
  const [finishing, setFinishing] = useState(false)

  // Passo salvo pode ter sumido (módulo desligado): cai no primeiro.
  const index = Math.max(0, steps.indexOf(current))
  const key = steps[index]
  const last = index === steps.length - 1
  const Step = STEPS[key].component

  useEffect(() => {
    if (open) sessionStorage.setItem(STORAGE_KEY, key)
  }, [open, key])

  function go(delta: number) {
    setCurrent(steps[Math.min(steps.length - 1, Math.max(0, index + delta))])
  }

  async function finish() {
    setFinishing(true)
    try {
      await onFinish()
      sessionStorage.removeItem(STORAGE_KEY)
      setCurrent('welcome')
    } catch {
      toast.error('Não foi possível concluir. Tente de novo.')
    } finally {
      setFinishing(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Configuração inicial</DialogTitle>
        <DialogDescription className="sr-only">
          Passo {index + 1} de {steps.length}: {STEPS[key].label}
        </DialogDescription>
        <ol className="flex items-center gap-1.5" aria-label="Progresso">
          {steps.map((s, i) => (
            <li
              key={s}
              title={STEPS[s].label}
              className={cn('h-1.5 flex-1 rounded-full', i <= index ? 'bg-primary' : 'bg-muted')}
            />
          ))}
        </ol>
        <div className="min-h-64 py-2">
          <Step />
        </div>
        <div className="flex items-center justify-between gap-2">
          {last ? (
            <span />
          ) : (
            <Button variant="ghost" size="sm" onClick={finish} disabled={finishing}>
              Pular configuração
            </Button>
          )}
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="outline" size="sm" onClick={() => go(-1)}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            )}
            {last ? (
              <Button size="sm" onClick={finish} disabled={finishing}>
                Começar
              </Button>
            ) : (
              <Button size="sm" onClick={() => go(1)}>
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
