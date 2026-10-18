import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '@/i18n/format'
import { localDateString } from '@/lib/dates'

// Estrutura de dados do heatmap (igual pra tarefas e hábitos).
export interface HeatmapData {
  from: string
  to: string
  counts: Record<string, number>
  total: number
}

// Textos que variam por tipo (tarefa vs hábito) — o resto do render é idêntico.
export interface HeatmapCopy {
  period: (total: number) => string // linha-resumo do topo
  cell: (n: number, day: string) => string // title da célula com n > 0
  empty: (day: string) => string // title da célula com n = 0
}

// Parse 'Y-m-d' como data LOCAL (evita `new Date('Y-m-d')`, que é UTC e pode errar o dia).
function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
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

// Cor do número dentro da célula (modo detalhado) — legível sobre cada nível.
const NUM_TEXT: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'text-muted-foreground/40',
  1: 'text-emerald-900 dark:text-emerald-100',
  2: 'text-emerald-950 dark:text-emerald-50',
  3: 'text-white dark:text-emerald-950',
  4: 'text-white dark:text-emerald-950',
}

// Linhas da grade (0=dom..6=sáb) que levam um rótulo de dia da semana.
const DOW_LABEL_ROWS: readonly number[] = [1, 3, 5]

function titleFor(count: number, day: string, copy: HeatmapCopy): string {
  return count > 0 ? copy.cell(count, day) : copy.empty(day)
}

function Legend() {
  const { t } = useTranslation('common')
  return (
    <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
      <span>{t('heatmap.less')}</span>
      {([0, 1, 2, 3, 4] as const).map((lvl) => (
        <div key={lvl} className={`h-[11px] w-[11px] rounded-sm ${LEVEL_CLASSES[lvl]}`} />
      ))}
      <span>{t('heatmap.more')}</span>
    </div>
  )
}

// ≤ ~1 mês: cada dia é uma célula grande com o número da conclusão dentro.
// Centralizado e com quebra de linha.
function DetailedView({ from, totalDays, counts, copy }: {
  from: Date
  totalDays: number
  counts: Record<string, number>
  copy: HeatmapCopy
}) {
  const { dayMonth } = useFormat()
  const days = Array.from({ length: totalDays }, (_, i) => addDays(from, i))
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {days.map((d) => {
        const count = counts[localDateString(d)] ?? 0
        const lvl = level(count)
        return (
          <div
            key={localDateString(d)}
            title={titleFor(count, dayMonth(d), copy)}
            className={`flex h-11 w-10 flex-col items-center justify-center rounded-md ${LEVEL_CLASSES[lvl]}`}
          >
            <span className={`text-sm font-bold ${NUM_TEXT[lvl]}`}>{count || ''}</span>
            <span className={`text-[9px] ${count > 0 ? NUM_TEXT[lvl] : 'text-muted-foreground'} opacity-90`}>
              {dayMonth(d)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// > 1 mês: grid estilo GitHub. As células redimensionam pra caber a largura
// (nunca corta) e o grid é centralizado quando mais estreito que o container.
function GridView({ from, to, counts, copy }: {
  from: Date
  to: Date
  counts: Record<string, number>
  copy: HeatmapCopy
}) {
  const { weekdayShort, monthShort, dayMonth } = useFormat()
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const start = addDays(from, -from.getDay()) // domingo em/antes de `from`
  const totalDays = Math.round((to.getTime() - start.getTime()) / 86400000) + 1
  const weekCount = Math.ceil(totalDays / 7)

  const LABEL_COL = 28
  const GAP = 3
  const avail = Math.max(0, width - LABEL_COL - 8)
  const raw = width ? Math.floor((avail - (weekCount - 1) * GAP) / weekCount) : 11
  const size = Math.max(7, Math.min(15, raw)) // px

  const weeks: Date[][] = []
  for (let w = 0; w < weekCount; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) week.push(addDays(start, w * 7 + d))
    weeks.push(week)
  }

  let prevMonth = -1
  const monthLabels = weeks.map((week) => {
    const month = week[0].getMonth()
    const show = month !== prevMonth
    if (show) prevMonth = month
    return show ? monthShort(week[0]) : null
  })

  const dowLabel = (row: number) => (DOW_LABEL_ROWS.includes(row) ? weekdayShort(row) : '')

  const cellStyle = { width: size, height: size }

  return (
    <div ref={ref} className="w-full">
      <div className="flex justify-center">
        <div className="inline-flex gap-1.5">
          <div className="flex flex-col" style={{ gap: GAP, paddingTop: 16 }}>
            {Array.from({ length: 7 }, (_, row) => (
              <div key={row} className="flex items-center text-[10px] text-muted-foreground" style={{ height: size, width: LABEL_COL - 4 }}>
                {dowLabel(row)}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((_, i) => (
                <div key={i} className="text-[10px] leading-none text-muted-foreground" style={{ width: size, whiteSpace: 'nowrap' }}>
                  {monthLabels[i] ?? ''}
                </div>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((date, j) => {
                    const placeholder = date < from || date > to
                    if (placeholder) return <div key={j} style={cellStyle} />
                    const count = counts[localDateString(date)] ?? 0
                    return (
                      <div
                        key={j}
                        style={cellStyle}
                        title={titleFor(count, dayMonth(date), copy)}
                        className={`rounded-sm ${LEVEL_CLASSES[level(count)]}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Heatmap({ data, copy }: { data: HeatmapData; copy: HeatmapCopy }) {
  const from = parseLocalDate(data.from)
  const to = parseLocalDate(data.to)
  const totalDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  const detailed = totalDays <= 31 // 7d/30d -> detalhado; 90d/365d -> grid

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{copy.period(data.total)}</p>
      {detailed ? (
        <DetailedView from={from} totalDays={totalDays} counts={data.counts} copy={copy} />
      ) : (
        <GridView from={from} to={to} counts={data.counts} copy={copy} />
      )}
      <Legend />
    </div>
  )
}
