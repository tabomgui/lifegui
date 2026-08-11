import type { TaskHeatmap as TaskHeatmapData } from '@/types/api'

const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Parse 'Y-m-d' as a LOCAL date (avoid `new Date('Y-m-d')`, which is UTC and can be off by a day).
function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtDayMonth(date: Date): string {
  return `${date.getDate()} de ${MONTHS_ABBR[date.getMonth()]}`
}

function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count <= 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3
  return 4
}

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-muted',
  1: 'bg-emerald-200 dark:bg-emerald-900',
  2: 'bg-emerald-300 dark:bg-emerald-700',
  3: 'bg-emerald-500 dark:bg-emerald-600',
  4: 'bg-emerald-600 dark:bg-emerald-400',
}

const DOW_LABELS: Record<number, string> = { 1: 'Seg', 3: 'Qua', 5: 'Sex' }

interface DayCell {
  date: Date
  isPlaceholder: boolean
}

export function TaskHeatmap({ data }: { data: TaskHeatmapData }) {
  const from = parseLocalDate(data.from)
  const end = parseLocalDate(data.to)
  const start = addDays(from, -from.getDay()) // Sunday on/before `from`

  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  const weekCount = Math.ceil(totalDays / 7)

  const weeks: DayCell[][] = []
  for (let w = 0; w < weekCount; w++) {
    const week: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d)
      week.push({ date, isPlaceholder: date > end })
    }
    weeks.push(week)
  }

  let prevMonth = -1
  const monthLabels = weeks.map((week) => {
    const month = week[0].date.getMonth()
    const show = month !== prevMonth
    if (show) prevMonth = month
    return show ? MONTHS_ABBR[month] : null
  })

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {data.total} tarefas concluídas no último ano
      </p>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-2">
          <div className="flex flex-col gap-[3px] pt-[18px]">
            {Array.from({ length: 7 }, (_, row) => (
              <div key={row} className="flex h-[11px] w-7 items-center text-[10px] text-muted-foreground">
                {DOW_LABELS[row] ?? ''}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-[3px]">
              {weeks.map((_, i) => (
                <div key={i} className="w-[11px] text-[10px] leading-none text-muted-foreground">
                  {monthLabels[i] ?? ''}
                </div>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-[3px]">
                  {week.map((cell, j) =>
                    cell.isPlaceholder ? (
                      <div key={j} className="h-[11px] w-[11px] invisible" />
                    ) : (
                      <div
                        key={j}
                        className={`h-[11px] w-[11px] rounded-sm ${LEVEL_CLASSES[level(data.counts[formatLocalDate(cell.date)] ?? 0)]}`}
                        title={
                          (data.counts[formatLocalDate(cell.date)] ?? 0) > 0
                            ? `${data.counts[formatLocalDate(cell.date)]} tarefa(s) concluída(s) em ${fmtDayMonth(cell.date)}`
                            : `Nenhuma tarefa em ${fmtDayMonth(cell.date)}`
                        }
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Menos</span>
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <div key={lvl} className={`h-[11px] w-[11px] rounded-sm ${LEVEL_CLASSES[lvl]}`} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  )
}
