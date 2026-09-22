import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarPlus, X } from 'lucide-react'
import { ScheduleDialog } from '@/components/calendar/schedule-dialog'
import { useDeleteEvent, useLinkedEvents } from '@/hooks/use-calendar'
import type { CalendarEvent, CalendarLinkType } from '@/types/api'

const DAY_LABEL: Record<string, string> = {
  SU: 'dom', MO: 'seg', TU: 'ter', WE: 'qua', TH: 'qui', FR: 'sex', SA: 'sáb',
}

/** "Toda seg, qua · 07:00" (recorrente) ou "qua, 23 de set · 19:00" (único). */
function describe(event: CalendarEvent): string {
  const start = event.start ? new Date(event.start) : null
  const time = start
    ? start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''
  const rrule = event.recurrence?.find((r) => r.startsWith('RRULE:'))
  if (rrule) {
    const byday = /BYDAY=([^;]+)/.exec(rrule)?.[1]
    const days = byday
      ? byday.split(',').map((d) => DAY_LABEL[d] ?? d.toLowerCase()).join(', ')
      : 'semana'
    return `Toda ${days} · ${time}`
  }
  return start
    ? `${start.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${time}`
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
  const { data: events = [], isError } = useLinkedEvents(type, refId)
  const remove = useDeleteEvent()
  const [scheduling, setScheduling] = useState(false)

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Agenda</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {events.map((event) => (
          <span
            key={event.id}
            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
          >
            <CalendarPlus className="h-3 w-3" />
            {describe(event)}
            <button
              type="button"
              aria-label="Remover do calendário"
              className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={async () => {
                try {
                  await remove.mutateAsync(event.id)
                  toast.success('Removido do calendário')
                } catch {
                  toast.error('Não foi possível remover')
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
          {isError ? 'Conectar calendário' : 'Agendar'}
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
