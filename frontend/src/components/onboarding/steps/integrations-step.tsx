import { CalendarCog, CircleCheck, Copy, Plug } from 'lucide-react'
import { toast } from 'sonner'
import { useCalendarStatus } from '@/hooks/use-calendar'
import { Button } from '@/components/ui/button'
import { StepHeader } from '@/components/onboarding/step-header'
import { CalendarCredentialsHint } from '@/components/calendar/calendar-credentials-hint'

export function IntegrationsStep() {
  const { data: calendar } = useCalendarStatus()
  const mcpUrl = `${window.location.origin}/mcp`

  async function copy() {
    try {
      await navigator.clipboard.writeText(mcpUrl)
      toast.success('URL copiada')
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader title="Integrações" description="Opcionais. Dá pra configurar depois em Configurações." />

      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarCog className="h-4 w-4" /> Google Calendar
        </div>
        <p className="text-sm text-muted-foreground">Agende tarefas, hábitos e estudos direto na sua agenda.</p>
        {calendar?.connected ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleCheck className="h-3.5 w-3.5 text-emerald-500" /> Conectado
          </span>
        ) : calendar?.configured ? (
          <Button
            size="sm"
            className="h-8"
            onClick={() => { window.location.href = '/api/auth/google-calendar/redirect' }}
          >
            Conectar Google Calendar
          </Button>
        ) : (
          <CalendarCredentialsHint />
        )}
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plug className="h-4 w-4" /> Assistentes de IA (MCP)
        </div>
        <p className="text-sm text-muted-foreground">
          Conecte o claude.ai, o Claude Code ou o ChatGPT para conversar com suas tarefas, hábitos e notas.
        </p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">{mcpUrl}</code>
          <Button size="sm" variant="outline" className="h-8" onClick={copy}>
            <Copy className="h-3.5 w-3.5" /> Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No claude.ai, adicione um conector personalizado com esta URL. No Claude Code:{' '}
          <code>claude mcp add --transport http lifegui {mcpUrl}</code>
        </p>
      </div>
    </div>
  )
}
