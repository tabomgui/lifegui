import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Segunda-feira (ISO) da semana que contém `date`, em 'Y-m-d'.
export function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() // 0=dom..6=sáb
  const diff = (day === 0 ? -6 : 1) - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function shiftWeek(week: string, deltaWeeks: number): string {
  const d = new Date(week + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7)
  return d.toISOString().slice(0, 10)
}

const DOW = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export const WEEK_DOW = DOW

export function WeekStepper({ week, onChange }: { week: string; onChange: (w: string) => void }) {
  const start = new Date(week + 'T00:00:00Z')
  const end = new Date(week + 'T00:00:00Z')
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`
  return (
    <div className="flex items-center gap-2 text-sm">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(shiftWeek(week, -1))} aria-label="Semana anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[110px] text-center text-muted-foreground">{fmt(start)} – {fmt(end)}</span>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(shiftWeek(week, 1))} aria-label="Próxima semana">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
