import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { toast } from 'sonner'
import { CalendarDays } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { NotePanel } from '@/components/brain/note-panel'
import {
  browserTimezone,
  useCalendarEvents,
  useCalendarStatus,
  useUpdateEvent,
} from '@/hooks/use-calendar'
import type { CalendarEvent } from '@/types/api'

// Cores por tipo de vínculo (mesma paleta dos módulos); externo fica neutro.
const TYPE_COLOR: Record<string, string> = {
  task: '#3b82f6',
  habit: '#10b981',
  note: '#8b5cf6',
}

function toEventInput(event: CalendarEvent): EventInput {
  const color = event.external ? undefined : TYPE_COLOR[event.lifegui?.type ?? '']
  return {
    id: event.id,
    title: event.title,
    start: event.start ?? undefined,
    end: event.end ?? undefined,
    allDay: event.all_day,
    // Só eventos do lifegui podem ser arrastados/redimensionados.
    editable: !event.external,
    backgroundColor: color,
    borderColor: color,
    classNames: event.external ? ['lifegui-external'] : [],
    extendedProps: { ev: event },
  }
}

export default function Agenda() {
  const { data: status, isLoading: statusLoading } = useCalendarStatus()
  const connected = status?.connected ?? false
  const navigate = useNavigate()
  const update = useUpdateEvent()

  // Período visível do calendário (datesSet) dirige a busca no Google.
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const { data: events = [] } = useCalendarEvents(
    range?.from ?? '',
    range?.to ?? '',
    connected && range !== null,
  )

  const [openNote, setOpenNote] = useState<string | null>(null)

  const inputs = useMemo(() => events.map(toEventInput), [events])

  function onEventClick(arg: EventClickArg) {
    const event = arg.event.extendedProps.ev as CalendarEvent
    if (event.external) {
      if (event.html_link) window.open(event.html_link, '_blank', 'noopener')
      return
    }
    if (event.lifegui?.type === 'note') setOpenNote(event.lifegui.ref)
    else if (event.lifegui?.type === 'habit') navigate('/habits')
    else navigate('/')
  }

  async function onEventMove(arg: EventDropArg | EventResizeDoneArg) {
    const { event, revert } = arg
    if (!event.start) return revert()
    try {
      await update.mutateAsync({
        id: event.id,
        start: event.start.toISOString(),
        // Sem end (evento encostado no fim) o FullCalendar devolve null: mantém o que está.
        ...(event.end ? { end: event.end.toISOString() } : {}),
        timezone: browserTimezone(),
      })
    } catch {
      toast.error('Não foi possível mover o evento')
      revert()
    }
  }

  return (
    <AppLayout title="Agenda">
      <main className="flex min-h-0 flex-1 flex-col">
        {statusLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : !connected ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex max-w-md flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Conecte seu Google Calendar</p>
              <p className="text-sm text-muted-foreground">
                A agenda mostra seu calendário Google ao vivo e deixa você agendar notas,
                hábitos e tarefas nele. Nada fica copiado no lifegui.
              </p>
              <Button size="sm" onClick={() => { window.location.href = '/api/auth/google-calendar/redirect' }}>
                Conectar Google Calendar
              </Button>
            </div>
          </div>
        ) : (
          <div className="agenda-calendar min-h-0 flex-1 overflow-auto p-4 md:p-6">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              locale={ptBrLocale}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridWeek,dayGridMonth',
              }}
              height="100%"
              nowIndicator
              events={inputs}
              datesSet={(arg) => setRange({ from: arg.start.toISOString(), to: arg.end.toISOString() })}
              eventClick={onEventClick}
              eventDrop={onEventMove}
              eventResize={onEventMove}
              scrollTime="07:00:00"
              dayMaxEventRows={4}
            />
          </div>
        )}
      </main>

      <NotePanel path={openNote} onNavigate={setOpenNote} onClose={() => setOpenNote(null)} />
    </AppLayout>
  )
}
