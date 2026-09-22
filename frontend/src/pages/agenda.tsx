import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { DateSelectArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { toast } from 'sonner'
import { ArrowUpRight, CalendarDays, ChevronDown, ExternalLink, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotePanel } from '@/components/brain/note-panel'
import { AgendaCreateDialog, type CreateSlot } from '@/components/calendar/agenda-create-dialog'
import { AgendaEditDialog } from '@/components/calendar/agenda-edit-dialog'
import {
  browserTimezone,
  useCalendarEvents,
  useCalendarStatus,
  useDeleteEvent,
  useUpdateEvent,
} from '@/hooks/use-calendar'
import type { CalendarEvent } from '@/types/api'

// Cores por tipo de vínculo (paleta dos módulos); externo fica neutro.
const TYPE_COLOR: Record<string, string> = {
  task: '#3b82f6',
  habit: '#10b981',
  note: '#8b5cf6',
  event: '#f59e0b',
}

type FilterKey = 'task' | 'habit' | 'note' | 'event' | 'external'

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'task', label: 'Tarefas', color: TYPE_COLOR.task },
  { key: 'habit', label: 'Hábitos', color: TYPE_COLOR.habit },
  { key: 'note', label: 'Notas', color: TYPE_COLOR.note },
  { key: 'event', label: 'Eventos', color: TYPE_COLOR.event },
  { key: 'external', label: 'Pessoais', color: '#94a3b8' },
]

const TYPE_LABEL: Record<string, string> = {
  task: 'Tarefa', habit: 'Hábito', note: 'Nota', event: 'Evento', external: 'Evento pessoal',
}

function filterKeyOf(event: CalendarEvent): FilterKey {
  if (event.external) return 'external'
  return (event.lifegui?.type ?? 'event') as FilterKey
}

function toEventInput(event: CalendarEvent): EventInput {
  const color = event.external ? undefined : TYPE_COLOR[event.lifegui?.type ?? 'event']
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

function formatRange(event: CalendarEvent): string {
  if (!event.start) return ''
  const start = new Date(event.start)
  const day = start.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  if (event.all_day) return day
  const startTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const endTime = event.end
    ? new Date(event.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null
  return `${day} · ${startTime}${endTime ? `–${endTime}` : ''}`
}

export default function Agenda() {
  const { data: status, isLoading: statusLoading } = useCalendarStatus()
  const connected = status?.connected ?? false
  const navigate = useNavigate()
  const update = useUpdateEvent()
  const remove = useDeleteEvent()

  // Período visível do calendário (datesSet) dirige a busca no Google.
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const { data: events = [] } = useCalendarEvents(
    range?.from ?? '',
    range?.to ?? '',
    connected && range !== null,
  )

  const [visible, setVisible] = useState<Set<FilterKey>>(new Set(FILTERS.map((f) => f.key)))
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [slot, setSlot] = useState<CreateSlot | null>(null)
  const [detail, setDetail] = useState<CalendarEvent | null>(null)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)

  const inputs = useMemo(
    () => events.filter((e) => visible.has(filterKeyOf(e))).map(toEventInput),
    [events, visible],
  )

  function toggleFilter(key: FilterKey) {
    setVisible((v) => {
      const next = new Set(v)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openCreate(start?: Date, durationMinutes = 60) {
    const base = start ?? new Date()
    setSlot({
      date: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`,
      time: start
        ? `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`
        : '19:00',
      durationMinutes,
    })
  }

  function onSelect(arg: DateSelectArg) {
    // Seleção de dia inteiro (visão mês) não tem hora: usa padrão da noite.
    const duration = arg.allDay ? 60 : Math.max(15, (arg.end.getTime() - arg.start.getTime()) / 60000)
    openCreate(arg.allDay ? undefined : arg.start, duration)
    if (arg.allDay) {
      setSlot((s) => (s ? { ...s, date: arg.start.toISOString().slice(0, 10) } : s))
    }
  }

  function onEventClick(arg: EventClickArg) {
    setDetail(arg.event.extendedProps.ev as CalendarEvent)
  }

  function openItem(event: CalendarEvent) {
    setDetail(null)
    if (event.lifegui?.type === 'note') setOpenNote(event.lifegui.ref)
    else if (event.lifegui?.type === 'habit') navigate('/habits')
    else if (event.lifegui?.type === 'task') navigate('/')
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

  async function removeDetail(seriesToo: boolean) {
    if (!detail) return
    // Só esta ocorrência = apaga a instância; série = apaga o evento "pai".
    const id = seriesToo ? (detail.recurring_event_id ?? detail.id) : detail.id
    try {
      await remove.mutateAsync(id)
      toast.success(seriesToo && detail.recurring_event_id ? 'Série removida' : 'Removido do calendário')
      setDetail(null)
    } catch {
      toast.error('Não foi possível remover')
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
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 md:p-6">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFilter(key)}
                  aria-pressed={visible.has(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    visible.has(key)
                      ? 'border-transparent bg-secondary'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${visible.has(key) ? '' : 'opacity-40'}`}
                    style={{ background: color }}
                  />
                  {label}
                </button>
              ))}
              <Button size="sm" className="ml-auto h-8" onClick={() => openCreate()}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Novo
              </Button>
            </div>

            <div className="agenda-calendar min-h-0 flex-1 overflow-auto">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                locale={ptBrLocale}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'timeGridDay,timeGridWeek,dayGridMonth',
                }}
                height="100%"
                nowIndicator
                selectable
                selectMirror
                events={inputs}
                datesSet={(arg) => setRange({ from: arg.start.toISOString(), to: arg.end.toISOString() })}
                select={onSelect}
                eventClick={onEventClick}
                eventDrop={onEventMove}
                eventResize={onEventMove}
                scrollTime="07:00:00"
                dayMaxEventRows={4}
              />
            </div>
          </div>
        )}
      </main>

      {/* Detalhes de um evento clicado: abrir o item vinculado ou remover. */}
      <Dialog open={detail !== null} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="sm:max-w-sm">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-left">{detail.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{formatRange(detail)}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: detail.external ? '#94a3b8' : TYPE_COLOR[detail.lifegui?.type ?? 'event'] }}
                    />
                    {TYPE_LABEL[filterKeyOf(detail)]}
                  </span>
                  {detail.recurring_event_id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      <Repeat className="h-3 w-3" /> Recorrente
                    </span>
                  )}
                  {detail.html_link && (
                    <a
                      href={detail.html_link}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" /> Google
                    </a>
                  )}
                </div>
              </div>
              <DialogFooter className="mt-1 flex-row justify-end gap-2">
                {!detail.external && (
                  <>
                    {detail.lifegui?.type !== 'event' && (
                      <Button size="sm" variant="ghost" className="mr-auto" onClick={() => openItem(detail)}>
                        <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Abrir {TYPE_LABEL[detail.lifegui?.type ?? 'event'].toLowerCase()}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setEditing(detail); setDetail(null) }}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    {detail.recurring_event_id ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" disabled={remove.isPending}
                            className="text-destructive hover:text-destructive">
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => removeDetail(false)}>
                            Só esta ocorrência
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => removeDetail(true)}>
                            Toda a série
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button size="sm" variant="outline" disabled={remove.isPending}
                        className="text-destructive hover:text-destructive" onClick={() => removeDetail(true)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AgendaCreateDialog open={slot !== null} slot={slot} onClose={() => setSlot(null)} />
      <AgendaEditDialog event={editing} onClose={() => setEditing(null)} />
      <NotePanel path={openNote} onNavigate={setOpenNote} onClose={() => setOpenNote(null)} />
    </AppLayout>
  )
}
