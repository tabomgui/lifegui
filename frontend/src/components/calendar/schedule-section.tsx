import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { CalendarPlus, X } from 'lucide-react'
import { ScheduleDialog } from '@/components/calendar/schedule-dialog'
import { useDeleteEvent, useLinkedEvents } from '@/hooks/use-calendar'
import { useFormat } from '@/i18n/format'
import type { CalendarEvent, CalendarLinkType } from '@/types/api'

// Dia da semana (0=dom..6=sáb) de cada código do RRULE (BYDAY).
const DAY_DOW: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
}

// Recorrente: pt-BR "Toda seg, qua · 07:00" (dias em minúscula, no meio da frase) /
// en "Every Mon, Wed · 07:00" (abreviação do dia mantém a inicial maiúscula). Único:
// "qua, 23 de set · 19:00", já formatado no idioma ativo por `useFormat().date`.
function describe(
  event: CalendarEvent,
  format: ReturnType<typeof useFormat>,
  t: TFunction<'calendar'>,
): string {
  const start = event.start ? new Date(event.start) : null
  const time = start ? format.time(start) : ''
  const rrule = event.recurrence?.find((r) => r.startsWith('RRULE:'))
  if (rrule) {
    const byday = /BYDAY=([^;]+)/.exec(rrule)?.[1]
    if (!byday) return t('scheduleSection.recurringFallback', { time })
    const days = byday.split(',').map((d) => {
      if (!(d in DAY_DOW)) return d.toLowerCase()
      const label = format.weekdayShort(DAY_DOW[d])
      // Dias da semana em português não são capitalizados no meio da frase; em
      // inglês a abreviação (Mon, Wed...) mantém a inicial maiúscula.
      return format.locale === 'pt-BR' ? label.toLowerCase() : label
    }).join(', ')
    return t('scheduleSection.recurring', { days, time })
  }
  return start
    ? `${format.date(start, { weekday: 'short', day: 'numeric', month: 'short' })} · ${time}`
    : event.title
}

/**
 * Agendamentos de um item (nota/hábito/tarefa) no Google Calendar: lista os
 * eventos vinculados (achados por extendedProperties, sem tabela local) e
 * permite agendar/remover.
 */
export function ScheduleSection({ type, refId, title, defaultRecurring = false }: {
  type: CalendarLinkType
  refId: string
  title: string
  defaultRecurring?: boolean
}) {
  const { t } = useTranslation('calendar')
  const format = useFormat()
  const { data: events = [], isError } = useLinkedEvents(type, refId)
  const remove = useDeleteEvent()
  const [scheduling, setScheduling] = useState(false)

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('scheduleSection.label')}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {events.map((event) => (
          <span
            key={event.id}
            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
          >
            <CalendarPlus className="h-3 w-3" />
            {describe(event, format, t)}
            <button
              type="button"
              aria-label={t('scheduleSection.removeAria')}
              className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={async () => {
                try {
                  await remove.mutateAsync(event.id)
                  toast.success(t('toast.removed'))
                } catch {
                  toast.error(t('toast.removeError'))
                }
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setScheduling(true)}
          className="inline-flex items-center gap-1 rounded border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <CalendarPlus className="h-3 w-3" />
          {isError ? t('connectShort') : t('scheduleButton')}
        </button>
      </div>

      <ScheduleDialog
        open={scheduling}
        type={type}
        refId={refId}
        defaultTitle={title}
        defaultRecurring={defaultRecurring}
        onClose={() => setScheduling(false)}
      />
    </div>
  )
}
