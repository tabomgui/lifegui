import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CalendarCog, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFormat } from '@/i18n/format'
import { useCalendarStatus, useDisconnectCalendar } from '@/hooks/use-calendar'
import { CalendarCredentialsHint } from '@/components/calendar/calendar-credentials-hint'

/**
 * Conexão da conta Google Calendar (OAuth incremental por cima do login).
 * O callback do backend volta pra cá com ?calendar=connected|mismatch|error.
 */
export function CalendarSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const { date } = useFormat()
  const { data, isLoading } = useCalendarStatus()
  const disconnect = useDisconnectCalendar()
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    const result = params.get('calendar')
    if (!result) return
    if (result === 'connected') {
      toast.success(t('calendar.toast.connected'))
      qc.invalidateQueries({ queryKey: ['calendar'] })
    } else if (result === 'mismatch') {
      toast.error(t('calendar.toast.mismatch'))
    } else {
      toast.error(t('calendar.toast.connectError'))
    }
    params.delete('calendar')
    setParams(params, { replace: true })
  }, [params, setParams, qc, t])

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          <CalendarCog className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-sm font-semibold">{t('calendar.title')}</div>
            <div className="text-sm text-muted-foreground">{t('calendar.description')}</div>
          </div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">{t('common:states.loading')}</p>
          ) : data?.connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <CircleCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t('calendar.connected')}
                {data.connected_at && <> {t('calendar.connectedSince', { date: date(data.connected_at) })}</>}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={disconnect.isPending}
                onClick={async () => {
                  try {
                    await disconnect.mutateAsync()
                    toast.success(t('calendar.toast.disconnected'))
                  } catch {
                    toast.error(t('calendar.toast.disconnectError'))
                  }
                }}
              >
                {t('calendar.disconnect')}
              </Button>
            </div>
          ) : data?.configured ? (
            <Button
              size="sm"
              className="h-8"
              onClick={() => { window.location.href = '/api/auth/google-calendar/redirect' }}
            >
              {t('calendar.connect')}
            </Button>
          ) : (
            <CalendarCredentialsHint />
          )}
        </div>
      </div>
    </div>
  )
}
