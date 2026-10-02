import { CalendarCog, CircleCheck, Copy, Plug } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCalendarStatus } from '@/hooks/use-calendar'
import { Button } from '@/components/ui/button'
import { StepHeader } from '@/components/onboarding/step-header'
import { CalendarCredentialsHint } from '@/components/calendar/calendar-credentials-hint'

export function IntegrationsStep() {
  const { t } = useTranslation(['onboarding', 'common'])
  const { data: calendar, isLoading: calendarLoading } = useCalendarStatus()
  const mcpUrl = `${window.location.origin}/mcp`

  async function copy() {
    try {
      await navigator.clipboard.writeText(mcpUrl)
      toast.success(t('integrations.urlCopied'))
    } catch {
      toast.error(t('integrations.copyError'))
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader title={t('integrations.title')} description={t('integrations.description')} />

      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarCog className="h-4 w-4" /> {t('integrations.calendarTitle')}
        </div>
        <p className="text-sm text-muted-foreground">{t('integrations.calendarDescription')}</p>
        {calendarLoading ? (
          <p className="text-xs text-muted-foreground">{t('common:states.loading')}</p>
        ) : calendar?.connected ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleCheck className="h-3.5 w-3.5 text-emerald-500" /> {t('integrations.connected')}
          </span>
        ) : calendar?.configured ? (
          <Button
            size="sm"
            className="h-8"
            onClick={() => { window.location.href = '/api/auth/google-calendar/redirect' }}
          >
            {t('integrations.connectCalendar')}
          </Button>
        ) : (
          <CalendarCredentialsHint />
        )}
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plug className="h-4 w-4" /> {t('integrations.mcpTitle')}
        </div>
        <p className="text-sm text-muted-foreground">{t('integrations.mcpDescription')}</p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">{mcpUrl}</code>
          <Button size="sm" variant="outline" className="h-8" onClick={copy}>
            <Copy className="h-3.5 w-3.5" /> {t('common:actions.copy')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('integrations.mcpHint')}{' '}
          <code>claude mcp add --transport http lifegui {mcpUrl}</code>
        </p>
      </div>
    </div>
  )
}
