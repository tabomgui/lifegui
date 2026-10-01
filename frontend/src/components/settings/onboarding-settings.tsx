import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOnboarding } from '@/contexts/onboarding-context'

export function OnboardingSettings() {
  const { replay } = useOnboarding()
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Introdução</div>
          <div className="text-sm text-muted-foreground">Reabra o assistente de configuração inicial.</div>
        </div>
      </div>
      <Button size="sm" variant="outline" className="h-8" onClick={replay}>
        Rever introdução
      </Button>
    </div>
  )
}
