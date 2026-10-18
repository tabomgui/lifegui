import { useEffect, useMemo, useState } from 'react'
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
import { browserTimezone, useCalendarEvent, useUpdateEvent } from '@/hooks/use-calendar'
import { useFormat } from '@/i18n/format'
import type { CalendarEvent } from '@/types/api'

// Ordem visual seg→dom; códigos do RRULE (BYDAY) e seus dias da semana (0=dom..6=sáb).
const WEEK_DAYS = [
  ['MO', 1], ['TU', 2], ['WE', 3], ['TH', 4],
  ['FR', 5], ['SA', 6], ['SU', 0],
] as const

function bydayOf(recurrence: string[] | null | undefined): Set<string> {
  const rrule = recurrence?.find((r) => r.startsWith('RRULE:'))
  const byday = rrule ? /BYDAY=([^;]+)/.exec(rrule)?.[1] : null
  return new Set(byday ? byday.split(',') : [])
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Edição de um evento da agenda. Em recorrentes dá pra escolher entre mudar
 * só a ocorrência clicada ou a série inteira (aí os dias da semana também
 * ficam editáveis — o backend transplanta a hora nova pro evento "pai").
 */
export function AgendaEditDialog({ event, onClose }: {
  event: CalendarEvent | null
  onClose: () => void
}) {
  const { t } = useTranslation(['calendar', 'common'])
  const format = useFormat()
  const update = useUpdateEvent()
  const isRecurring = !!event?.recurring_event_id || (event?.recurrence?.length ?? 0) > 0
  // Pai da série: fonte dos dias da semana atuais (ocorrência não carrega RRULE).
  const { data: master } = useCalendarEvent(event?.recurring_event_id ?? null)
  const series = event?.recurring_event_id ? master : event

  const [scope, setScope] = useState<'occurrence' | 'series'>('occurrence')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [days, setDays] = useState<Set<string>>(new Set())
  const [touchedDays, setTouchedDays] = useState(false)

  useEffect(() => {
    if (!event?.start) return
    const start = new Date(event.start)
    setScope(isRecurring ? 'series' : 'occurrence')
    setTitle(event.title)
    setDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`)
    setTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`)
    setDuration(String(event.end
      ? Math.max(5, Math.round((new Date(event.end).getTime() - start.getTime()) / 60000))
      : 60))
    setDays(new Set())
    setTouchedDays(false)
  }, [event, isRecurring])

  // Dias atuais chegam depois (fetch do pai): só preenche se o usuário não mexeu.
  const currentDays = useMemo(() => bydayOf(series?.recurrence), [series])
  useEffect(() => {
    if (!touchedDays && currentDays.size > 0) setDays(new Set(currentDays))
  }, [currentDays, touchedDays])

  async function submit() {
    if (!event || !title.trim() || !date || !time) return
    const start = new Date(`${date}T${time}:00`)
    const end = new Date(start.getTime() + Math.max(5, Number(duration) || 60) * 60000)
    const editSeries = isRecurring && scope === 'series'
    try {
      await update.mutateAsync({
        id: event.id,
        title: title.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
        timezone: browserTimezone(),
        ...(editSeries
          ? {
              scope: 'series' as const,
              ...(days.size > 0
                ? { rrule: `RRULE:FREQ=WEEKLY;BYDAY=${WEEK_DAYS.filter(([c]) => days.has(c)).map(([c]) => c).join(',')}` }
                : {}),
            }
          : {}),
      })
      toast.success(editSeries ? t('toast.seriesUpdated') : t('toast.eventUpdated'))
      onClose()
    } catch (e) {
      const res = (e as { response?: { data?: { message?: string } } }).response
      toast.error(res?.data?.message ?? t('toast.saveError'))
    }
  }

  return (
    <Dialog open={event !== null} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isRecurring && (
            <div className="flex gap-1.5">
              {(['series', 'occurrence'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                    scope === value ? 'border-transparent bg-secondary' : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {t(`scope.${value}`)}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-title">{t('titleLabel')}</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(!isRecurring || scope === 'occurrence') && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">{t('dateLabel')}</Label>
                <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-time">{t('timeLabel')}</Label>
              <Input id="edit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-duration">{t('durationLabel')}</Label>
              <Input id="edit-duration" type="number" min={5} max={1440} step={5} value={duration}
                onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>

          {isRecurring && scope === 'series' && (
            <div className="space-y-1.5">
              <Label>{t('weekdaysLabel')}</Label>
              <div className="flex gap-1">
                {WEEK_DAYS.map(([code, dow]) => (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={days.has(code)}
                    onClick={() => {
                      setTouchedDays(true)
                      setDays((d) => {
                        const next = new Set(d)
                        if (next.has(code)) next.delete(code)
                        else next.add(code)
                        return next
                      })
                    }}
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
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={update.isPending || !title.trim() || (isRecurring && scope === 'series' && days.size === 0)}
          >
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
