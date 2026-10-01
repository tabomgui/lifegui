import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarCog, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalendarStatus, useDisconnectCalendar } from '@/hooks/use-calendar'
import { CalendarCredentialsHint } from '@/components/calendar/calendar-credentials-hint'

/**
 * Conexão da conta Google Calendar (OAuth incremental por cima do login).
 * O callback do backend volta pra cá com ?calendar=connected|mismatch|error.
 */
export function CalendarSettings() {
  const { data } = useCalendarStatus()
  const disconnect = useDisconnectCalendar()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    const result = params.get('calendar')
    if (!result) return
    if (result === 'connected') {
      toast.success('Google Calendar conectado')
      qc.invalidateQueries({ queryKey: ['calendar'] })
    } else if (result === 'mismatch') {
      toast.error('Use a mesma conta Google do seu login')
    } else {
      toast.error('Não foi possível conectar o Google Calendar')
    }
    params.delete('calendar')
    setParams(params, { replace: true })
  }, [params, setParams, qc])

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          <CalendarCog className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-sm font-semibold">Google Calendar</div>
            <div className="text-sm text-muted-foreground">
              Agende estudos, hábitos e tarefas direto no seu calendário. O Google é a fonte
              da verdade — o lifegui lê e escreve na sua agenda, sem cópia local.
            </div>
          </div>
          {data?.connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <CircleCheck className="h-3.5 w-3.5 text-emerald-500" />
                Conectado
                {data.connected_at && <> desde {new Date(data.connected_at).toLocaleDateString('pt-BR')}</>}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={disconnect.isPending}
                onClick={async () => {
                  try {
                    await disconnect.mutateAsync()
                    toast.success('Google Calendar desconectado')
                  } catch {
                    toast.error('Não foi possível desconectar')
                  }
                }}
              >
                Desconectar
              </Button>
            </div>
          ) : data?.configured ? (
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
      </div>
    </div>
  )
}
