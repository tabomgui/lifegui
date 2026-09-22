import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import type { CalendarLinkType } from '@/types/api'

// Ordem visual seg→dom; códigos são os do RRULE (BYDAY).
const WEEK_DAYS = [
  ['MO', 'seg'], ['TU', 'ter'], ['WE', 'qua'], ['TH', 'qui'],
  ['FR', 'sex'], ['SA', 'sáb'], ['SU', 'dom'],
] as const

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Agenda um item (nota/hábito/tarefa) no Google Calendar. Repetição semanal
 * vira RRULE — a recorrência é do Google, não nossa. `defaultRecurring`
 * pré-liga a repetição (caso hábito).
 */
export function ScheduleDialog({ open, type, refId, defaultTitle, defaultRecurring = false, onClose }: {
  open: boolean
  type: CalendarLinkType
  refId: string
  defaultTitle: string
  defaultRecurring?: boolean
  onClose: () => void
}) {
  const schedule = useScheduleEvent()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('19:00')
  const [duration, setDuration] = useState('60')
  const [recurring, setRecurring] = useState(false)
  const [days, setDays] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
      setDate(today())
      setTime('19:00')
      setDuration('60')
      setRecurring(defaultRecurring)
      setDays(new Set())
    }
  }, [open, defaultTitle, defaultRecurring])

  async function submit() {
    if (!title.trim() || !date || !time) return
    const start = new Date(`${date}T${time}:00`)
    const rrule = recurring && days.size > 0
      ? `RRULE:FREQ=WEEKLY;BYDAY=${WEEK_DAYS.filter(([code]) => days.has(code)).map(([code]) => code).join(',')}`
      : undefined
    try {
      await schedule.mutateAsync({
        type,
        ref: refId,
        title: title.trim(),
        start: start.toISOString(),
        duration_minutes: Math.max(5, Number(duration) || 60),
        ...(rrule ? { rrule } : {}),
        timezone: browserTimezone(),
      })
      toast.success('Agendado no Google Calendar')
      onClose()
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status
      toast.error(status === 409 ? 'Conecte o Google Calendar em Configurações' : 'Não foi possível agendar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar no calendário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sched-title">Título do evento</Label>
            <Input id="sched-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sched-date">{recurring ? 'A partir de' : 'Data'}</Label>
              <Input id="sched-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-time">Hora</Label>
              <Input id="sched-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-duration">Duração (min)</Label>
              <Input id="sched-duration" type="number" min={5} max={1440} step={5} value={duration}
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
              Repetir semanalmente
            </button>
            {recurring && (
              <div className="flex gap-1">
                {WEEK_DAYS.map(([code, label]) => (
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
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={schedule.isPending || !title.trim() || (recurring && days.size === 0)}
          >
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
