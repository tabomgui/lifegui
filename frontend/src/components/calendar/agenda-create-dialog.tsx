import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, Kanban, NotebookPen, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { browserTimezone, useScheduleEvent } from '@/hooks/use-calendar'
import { useTasks } from '@/hooks/use-tasks'
import { useHabits } from '@/hooks/use-habits'
import { useBrainNotes } from '@/hooks/use-brain'
import { useFormat } from '@/i18n/format'
import type { CalendarLinkType } from '@/types/api'

const KINDS: { key: CalendarLinkType; icon: typeof CalendarPlus }[] = [
  { key: 'event', icon: CalendarPlus },
  { key: 'task', icon: Kanban },
  { key: 'habit', icon: Repeat },
  { key: 'note', icon: NotebookPen },
]

// Ordem visual seg→dom; códigos do RRULE (BYDAY) e seus dias da semana (0=dom..6=sáb).
const WEEK_DAYS = [
  ['MO', 1], ['TU', 2], ['WE', 3], ['TH', 4],
  ['FR', 5], ['SA', 6], ['SU', 0],
] as const

export interface CreateSlot {
  date: string
  time: string
  durationMinutes: number
}

const selectClass =
  'border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

/**
 * Criação a partir da agenda (botão "Novo" ou clique/arrasto num horário
 * vago): evento avulso ou agendamento de tarefa/hábito/nota existente.
 */
export function AgendaCreateDialog({ open, slot, onClose }: {
  open: boolean
  slot: CreateSlot | null
  onClose: () => void
}) {
  const { t } = useTranslation(['calendar', 'common'])
  const format = useFormat()
  const schedule = useScheduleEvent()
  const { data: tasks = [] } = useTasks()
  const { data: habits = [] } = useHabits(false, open)
  const { data: notes = [] } = useBrainNotes()

  const [kind, setKind] = useState<CalendarLinkType>('event')
  const [refId, setRefId] = useState('')
  const [title, setTitle] = useState('')
  const [touchedTitle, setTouchedTitle] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('19:00')
  const [duration, setDuration] = useState('60')
  const [recurring, setRecurring] = useState(false)
  const [days, setDays] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && slot) {
      setKind('event')
      setRefId('')
      setTitle('')
      setTouchedTitle(false)
      setDate(slot.date)
      setTime(slot.time)
      setDuration(String(slot.durationMinutes))
      setRecurring(false)
      setDays(new Set())
    }
  }, [open, slot])

  const openTasks = tasks.filter((t) => t.status !== 'done')

  // Escolher o item preenche o título (editável até o usuário mexer nele).
  function pickRef(value: string) {
    setRefId(value)
    if (touchedTitle) return
    if (kind === 'task') setTitle(openTasks.find((t) => String(t.id) === value)?.title ?? '')
    else if (kind === 'habit') setTitle(habits.find((h) => String(h.id) === value)?.name ?? '')
    else if (kind === 'note') {
      const note = notes.find((n) => n.path === value)
      setTitle(note ? t('studyNote', { title: note.title }) : '')
    }
  }

  async function submit() {
    if (!title.trim() || !date || !time) return
    if (kind !== 'event' && !refId) return
    const rrule = recurring && days.size > 0
      ? `RRULE:FREQ=WEEKLY;BYDAY=${WEEK_DAYS.filter(([code]) => days.has(code)).map(([code]) => code).join(',')}`
      : undefined
    try {
      await schedule.mutateAsync({
        type: kind,
        ref: kind === 'event' ? '' : refId,
        title: title.trim(),
        start: new Date(`${date}T${time}:00`).toISOString(),
        duration_minutes: Math.max(5, Number(duration) || 60),
        ...(rrule ? { rrule } : {}),
        timezone: browserTimezone(),
      })
      toast.success(t('toast.created'))
      onClose()
    } catch (e) {
      const res = (e as { response?: { status?: number; data?: { message?: string } } }).response
      if (res?.status === 409) toast.error(t('toast.connectRequired'))
      else toast.error(res?.data?.message ?? t('toast.createError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {KINDS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={kind === key}
                onClick={() => { setKind(key); setRefId(''); if (!touchedTitle) setTitle('') }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  kind === key ? 'border-transparent bg-secondary' : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-3 w-3" /> {t(`types.${key}`)}
              </button>
            ))}
          </div>

          {kind !== 'event' && (
            <div className="space-y-1.5">
              <Label htmlFor="create-ref">
                {t(`types.${kind}`)}
              </Label>
              <select id="create-ref" value={refId} onChange={(e) => pickRef(e.target.value)} className={selectClass}>
                <option value="">{t('choosePlaceholder')}</option>
                {kind === 'task' && openTasks.map((task) => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
                {kind === 'habit' && habits.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
                {kind === 'note' && notes.map((n) => (
                  <option key={n.path} value={n.path}>{n.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="create-title">{t('eventTitleLabel')}</Label>
            <Input id="create-title" value={title}
              onChange={(e) => { setTitle(e.target.value); setTouchedTitle(true) }} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-date">{recurring ? t('startingLabel') : t('dateLabel')}</Label>
              <Input id="create-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-time">{t('timeLabel')}</Label>
              <Input id="create-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-duration">{t('durationLabel')}</Label>
              <Input id="create-duration" type="number" min={5} max={1440} step={5} value={duration}
                onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setRecurring((r) => !r)}
              aria-pressed={recurring}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                recurring ? 'border-transparent bg-secondary' : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {t('repeatWeekly')}
            </button>
            {recurring && (
              <div className="flex gap-1">
                {WEEK_DAYS.map(([code, dow]) => (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={days.has(code)}
                    onClick={() => setDays((d) => {
                      const next = new Set(d)
                      if (next.has(code)) next.delete(code)
                      else next.add(code)
                      return next
                    })}
                    className={`h-8 w-9 rounded-md border text-xs font-medium ${
                      days.has(code)
                        ? 'border-transparent bg-secondary text-secondary-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {format.weekdayShort(dow)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={
              schedule.isPending
              || !title.trim()
              || (kind !== 'event' && !refId)
              || (recurring && days.size === 0)
            }
          >
            {t('common:actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
