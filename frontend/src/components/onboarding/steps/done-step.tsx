import { CircleCheck } from 'lucide-react'
import { useModules } from '@/hooks/use-modules'
import { useCategories } from '@/hooks/use-categories'
import { useHabits } from '@/hooks/use-habits'

export function DoneStep() {
  const { data: modules = [] } = useModules()
  const enabled = modules.filter((m) => m.enabled)
  const tasksOn = enabled.some((m) => m.key === 'tasks')
  const habitsOn = enabled.some((m) => m.key === 'habits')
  const { data: categories = [] } = useCategories()
  const { data: habits = [] } = useHabits(false, habitsOn)

  return (
    <div className="space-y-4 py-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CircleCheck className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Tudo pronto</h2>
        <p className="text-sm text-muted-foreground">
          Módulos ativos: {enabled.length ? enabled.map((m) => m.label).join(', ') : 'nenhum'}.
        </p>
        <ul className="space-y-0.5 text-sm text-muted-foreground">
          {tasksOn && <li>{categories.length} categoria(s) de tarefas</li>}
          {habitsOn && <li>{habits.length} hábito(s)</li>}
        </ul>
      </div>
    </div>
  )
}
