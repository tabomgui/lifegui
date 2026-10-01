import { Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export function WelcomeStep() {
  const { user } = useAuth()
  const firstName = user?.name.split(' ')[0] ?? ''
  return (
    <div className="space-y-4 py-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Boas-vindas{firstName && `, ${firstName}`}</h2>
        <p className="text-sm text-muted-foreground">
          O lifegui reúne tarefas, hábitos, notas e agenda num lugar só. Em poucos passos você escolhe
          o que usar e já começa com tudo pronto.
        </p>
      </div>
    </div>
  )
}
