import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
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
import { useFormat } from '@/i18n/format'
import type { CalendarLinkType } from '@/types/api'
import { localDateString } from '@/lib/dates'

// Ordem visual seg→dom; códigos são os do RRULE (BYDAY) e seus dias da semana (0=dom..6=sáb).
const WEEK_DAYS = [
  ['MO', 1], ['TU', 2], ['WE', 3], ['TH', 4],
  ['FR', 5], ['SA', 6], ['SU', 0],
] as const

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
  const { t } = useTranslation('calendar')
  const format = useFormat()
  const schedule = useScheduleEvent()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(localDateString)
  const [time, setTime] = useState('19:00')
  const [duration, setDuration] = useState('60')
  const [recurring, setRecurring] = useState(false)
  const [days, setDays] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
      setDate(localDateString())
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
      toast.success(t('toast.scheduled'))
      onClose()
    } catch (e) {
      const res = (e as { response?: { status?: number; data?: { message?: string } } }).response
      if (res?.status === 409) toast.error(t('toast.connectRequired'))
      else toast.error(res?.data?.message ?? t('toast.scheduleError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('scheduleDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sched-title">{t('eventTitleLabel')}</Label>
            <Input id="sched-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sched-date">{recurring ? t('startingLabel') : t('dateLabel')}</Label>
              <Input id="sched-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-time">{t('timeLabel')}</Label>
              <Input id="sched-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-duration">{t('durationLabel')}</Label>
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
            disabled={schedule.isPending || !title.trim() || (recurring && days.size === 0)}
          >
            {t('scheduleButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
