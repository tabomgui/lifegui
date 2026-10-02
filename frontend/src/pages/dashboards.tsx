import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  AlarmClockOff,
  CalendarClock,
  CalendarX,
  Brain,
  CheckCircle2,
  Flame,
  GitBranch,
  Grid3x3,
  Inbox,
  Kanban,
  LineChart,
  NotebookPen,
  PenLine,
  Repeat,
  Target,
  Timer,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { TaskHeatmap } from '@/components/task-heatmap'
import { HabitHeatmap } from '@/components/habit-heatmap'
import { HabitRadar } from '@/components/habit-radar'
import { StatTile } from '@/components/stat-tile'
import { PeriodFilter, rangeForDays, PERIODS } from '@/components/period-filter'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTaskReport, useHabitReport, useBrainReport } from '@/hooks/use-reports'
import { useBrainCategories } from '@/hooks/use-brain'
import { DynamicIcon } from '@/components/icon'
import { useTaskHeatmap, useHabitHeatmap } from '@/hooks/use-heatmap'
import { useHabitStats } from '@/hooks/use-habit-stats'
import { useEnabledModules } from '@/hooks/use-modules'
import { useFormat } from '@/i18n/format'
import type { BrainReport, HabitReport, TaskReport } from '@/types/api'

// ---- shared chart tokens ----
const BLUE = '#3b82f6'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const SLATE = '#94a3b8'
const GRID = 'hsl(var(--border))'
const MUTED = 'hsl(var(--muted-foreground))'

function daysForKey(key: string): number {
  return (PERIODS.find((p) => p.key === key) ?? PERIODS[2]).days
}

// Parse 'Y-m-d' as a LOCAL date (avoid `new Date('Y-m-d')`, which is UTC).
function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// `n` dias com o sufixo "d" ("{{value}}d" em ambos os idiomas), número no formato do idioma ativo.
function fmtDays(n: number, t: TFunction<'dashboards'>, format: ReturnType<typeof useFormat>, opts?: Intl.NumberFormatOptions): string {
  return t('units.days', { value: format.number(n, opts) })
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

// ============ Criadas vs concluídas por semana (grouped bars, 2 hues) ============
function WeeklyFlowChart({ weekly }: { weekly: TaskReport['weekly'] }) {
  const { t } = useTranslation('dashboards')
  const { dayMonth } = useFormat()
  if (weekly.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('charts.noData')}</p>
  }
  const W = 560
  const H = 210
  const padL = 26
  const padR = 8
  const padT = 12
  const padB = 26
  const n = weekly.length
  const max = Math.max(1, ...weekly.map((w) => Math.max(w.created, w.completed)))
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const groupW = plotW / n
  const barW = Math.min(14, groupW * 0.32)
  const gap = groupW * 0.06
  const Y = (v: number) => padT + plotH - (v / max) * plotH
  // Sparse x labels so long windows (e.g. 1 ano) don't collide.
  const labelEvery = Math.ceil(n / 12)

  const ticks = [0, Math.round(max / 2), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {ticks.map((val, i) => {
        const y = Y(val)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fill={MUTED} fontSize={9}>
              {val}
            </text>
          </g>
        )
      })}
      {weekly.map((w, i) => {
        const gx = padL + i * groupW
        const x1 = gx + groupW / 2 - barW - gap / 2
        const x2 = gx + groupW / 2 + gap / 2
        const showLabel = i % labelEvery === 0
        const weekLabel = dayMonth(parseLocalDate(w.weekStart))
        return (
          <g key={w.weekStart}>
            <title>
              {t('tasks.flowSection.weeklyChart.tooltip', { date: weekLabel, created: w.created, completed: w.completed })}
            </title>
            {w.completed < w.created && (
              <rect x={gx} y={padT} width={groupW} height={plotH} fill={AMBER} opacity={0.06} />
            )}
            <rect x={x1} y={Y(w.created)} width={barW} height={padT + plotH - Y(w.created)} rx={2} fill={AMBER} />
            <rect x={x2} y={Y(w.completed)} width={barW} height={padT + plotH - Y(w.completed)} rx={2} fill={BLUE} />
            {showLabel && (
              <text x={gx + groupW / 2} y={H - 8} textAnchor="middle" fill={MUTED} fontSize={9}>
                {weekLabel}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ============ Trabalho aberto por categoria (donut + list) ============
function CategoryDonut({ data }: { data: TaskReport['openByCategory'] }) {
  const { t } = useTranslation(['dashboards', 'tasks'])
  const items = data.map((d) => ({
    name: d.name ?? t('tasks:card.noCategory'),
    color: d.color ?? SLATE,
    value: d.open,
  }))
  const total = items.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('tasks.flowSection.categoryDonut.empty')}</p>
  }
  const size = 150
  const thick = 24
  const r = (size - thick) / 2 - 2
  const cx = size / 2
  const cy = size / 2
  const gap = items.length > 1 ? 0.04 : 0
  let a0 = -Math.PI / 2
  const arcs = items.map((d) => {
    const frac = d.value / total
    const a1 = a0 + frac * 2 * Math.PI
    const s = a0 + gap / 2
    const e = a1 - gap / 2
    const x0 = cx + r * Math.cos(s)
    const y0 = cy + r * Math.sin(s)
    const x1 = cx + r * Math.cos(e)
    const y1 = cy + r * Math.sin(e)
    const large = e - s > Math.PI ? 1 : 0
    a0 = a1
    return { d, path: `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}` }
  })

  return (
    <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[130px] w-[130px] shrink-0">
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill="none" stroke={a.d.color} strokeWidth={thick} strokeLinecap="round">
            <title>{`${a.d.name}: ${a.d.value}`}</title>
          </path>
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={26} fontWeight={600}>
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill={MUTED} fontSize={9}>
          {t('tasks.flowSection.categoryDonut.openLabel')}
        </text>
      </svg>
      <div className="w-full flex-1 space-y-2">
        {items.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <Swatch color={d.color} label={d.name} />
            <span className="font-medium tabular-nums text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ Aging WIP ============
function AgingWipList({ items }: { items: TaskReport['agingWip'] }) {
  const { t } = useTranslation('dashboards')
  const format = useFormat()
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('tasks.flowSection.agingWip.empty')}</p>
  }
  const max = Math.max(1, ...items.map((i) => i.days))
  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const tier = it.days > 30 ? RED : it.days > 7 ? AMBER : MUTED
        const w = (it.days / max) * 100
        return (
          <div key={it.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: it.categoryColor ?? SLATE }}
                />
                <span className="truncate">{it.title}</span>
              </span>
              <span
                className="ml-2 shrink-0 font-medium tabular-nums"
                style={{ color: it.days > 7 ? tier : undefined }}
              >
                {fmtDays(it.days, t, format)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${w}%`, background: tier }} />
            </div>
          </div>
        )
      })}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: AMBER }} /> {t('tasks.flowSection.agingWip.legendOver7')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RED }} /> {t('tasks.flowSection.agingWip.legendOver30')}
        </span>
      </div>
    </div>
  )
}

// ============ Vencendo em breve — Atrasadas leader + 7 day bars ============
function DueSoonChart({ dueSoon, overdue }: { dueSoon: TaskReport['dueSoon']; overdue: number }) {
  const { t } = useTranslation('dashboards')
  const { weekdayShort } = useFormat()
  const W = 560
  const H = 200
  const padL = 24
  const padR = 8
  const padT = 12
  const padB = 28
  const cols = 1 + dueSoon.length // overdue leader + 7 days
  const max = Math.max(1, overdue, ...dueSoon.map((d) => d.count))
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const slot = plotW / cols
  const bw = slot * 0.5
  const Y = (v: number) => padT + plotH - (v / max) * plotH
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i)

  const bars: { label: string; value: number; color: string; emphasize: boolean }[] = [
    { label: t('tasks.dueSection.dueSoon.overdueShort'), value: overdue, color: RED, emphasize: true },
    ...dueSoon.map((d, i) => ({
      label: i === 0 ? t('tasks.dueSection.dueSoon.today') : weekdayShort(parseLocalDate(d.date).getDay()),
      value: d.count,
      color: BLUE,
      emphasize: false,
    })),
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {ticks.map((val, i) => {
        const y = Y(val)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={padL - 5} y={y + 3} textAnchor="end" fill={MUTED} fontSize={9}>
              {val}
            </text>
          </g>
        )
      })}
      {/* divider after the overdue leader */}
      <line
        x1={padL + slot}
        y1={padT}
        x2={padL + slot}
        y2={padT + plotH}
        stroke={GRID}
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      {bars.map((b, i) => {
        const cx = padL + (i + 0.5) * slot - bw / 2
        const h = (b.value / max) * plotH
        const y = padT + plotH - h
        return (
          <g key={i}>
            <title>{`${b.label}: ${b.value}`}</title>
            {b.value > 0 && <rect x={cx} y={y} width={bw} height={h} rx={2} fill={b.color} />}
            {b.value > 0 && (
              <text x={cx + bw / 2} y={y - 4} textAnchor="middle" fill={MUTED} fontSize={9}>
                {b.value}
              </text>
            )}
            <text
              x={cx + bw / 2}
              y={padT + plotH + 14}
              textAnchor="middle"
              fill={b.emphasize ? RED : MUTED}
              fontSize={9}
              fontWeight={b.emphasize ? 600 : 400}
            >
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ============ Taxa de conclusão no prazo (stacked bar) ============
function OnTimeRate({ data }: { data: TaskReport['onTimeRate'] }) {
  const { t } = useTranslation('dashboards')
  const rate = data.rate
  const rest = Math.max(0, 100 - rate)
  const delta = data.rate - data.previousRate
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-semibold tabular-nums text-foreground">{rate}%</div>
          <p className="text-xs text-muted-foreground">{t('tasks.dueSection.onTimeRate.caption', { total: data.total })}</p>
        </div>
        {data.total > 0 && (
          <span
            className={`mb-1 inline-flex items-center gap-0.5 text-xs font-medium ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
          >
            {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {delta >= 0 ? '+' : ''}
            {delta}pp
          </span>
        )}
      </div>
      <div className="mt-3 flex h-6 w-full overflow-hidden rounded-md bg-muted">
        <div
          className="flex items-center justify-center"
          style={{ width: `${rate}%`, background: BLUE }}
          title={t('tasks.dueSection.onTimeRate.onTimeTitle', { rate })}
        >
          {rate >= 12 && <span className="text-[10px] font-medium text-white">{rate}%</span>}
        </div>
        <div style={{ width: `${rest}%`, background: AMBER }} title={t('tasks.dueSection.onTimeRate.lateTitle', { rate: rest })} />
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        <Swatch color={BLUE} label={t('tasks.dueSection.onTimeRate.onTimeSwatch', { count: data.onTime })} />
        <Swatch color={AMBER} label={t('tasks.dueSection.onTimeRate.lateSwatch', { count: data.total - data.onTime })} />
      </div>
    </div>
  )
}

// ============ Atrasadas por tempo de atraso (histogram) ============
function OverdueHistogram({ data }: { data: TaskReport['overdueByAgeBucket'] }) {
  const { t } = useTranslation('dashboards')
  const buckets: { label: string; value: number; color: string }[] = [
    { label: t('tasks.dueSection.overdueHistogram.buckets.1-3'), value: data['1-3'], color: '#fca5a5' },
    { label: t('tasks.dueSection.overdueHistogram.buckets.4-7'), value: data['4-7'], color: '#f87171' },
    { label: t('tasks.dueSection.overdueHistogram.buckets.8-30'), value: data['8-30'], color: '#ef4444' },
    { label: t('tasks.dueSection.overdueHistogram.buckets.30+'), value: data['30+'], color: '#b91c1c' },
  ]
  const W = 360
  const H = 170
  const padL = 24
  const padR = 8
  const padT = 12
  const padB = 26
  const n = buckets.length
  const max = Math.max(1, ...buckets.map((b) => b.value))
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const bw = (plotW / n) * 0.55
  const Y = (v: number) => padT + plotH - (v / max) * plotH
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {ticks.map((val, i) => {
        const y = Y(val)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={padL - 5} y={y + 3} textAnchor="end" fill={MUTED} fontSize={9}>
              {val}
            </text>
          </g>
        )
      })}
      {buckets.map((b, i) => {
        const cx = padL + (i + 0.5) * (plotW / n) - bw / 2
        const h = (b.value / max) * plotH
        return (
          <g key={i}>
            <title>{`${b.label}: ${b.value}`}</title>
            {b.value > 0 && <rect x={cx} y={Y(b.value)} width={bw} height={h} rx={2} fill={b.color} />}
            <text x={cx + bw / 2} y={Y(b.value) - 4} textAnchor="middle" fill={MUTED} fontSize={9}>
              {b.value}
            </text>
            <text x={cx + bw / 2} y={padT + plotH + 14} textAnchor="middle" fill={MUTED} fontSize={9}>
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ============ Trabalho aberto sem data (ring) ============
function NoDueDateRing({ data }: { data: TaskReport['noDueDate'] }) {
  const { t } = useTranslation('dashboards')
  const pct = data.pct
  const size = 90
  const r = 36
  const cx = size / 2
  const cy = size / 2
  const C = 2 * Math.PI * r
  return (
    <div className="mt-3 flex items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[84px] w-[84px] shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={GRID} strokeWidth={9} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={AMBER}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${(C * pct) / 100} ${C}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={18} fontWeight={600}>
          {pct}%
        </text>
      </svg>
      <div>
        <div className="text-3xl font-semibold tabular-nums text-foreground">{pct}%</div>
        <p className="text-xs text-muted-foreground">
          {t('tasks.dueSection.noDueDate.caption', { count: data.count, total: data.total })}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground/80">{t('tasks.dueSection.noDueDate.hint')}</p>
      </div>
    </div>
  )
}

// ============ Section wrappers ============
function SectionHeading({ icon: Icon, children }: { icon: typeof GitBranch; children: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold tracking-tight">{children}</h2>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  className,
  children,
}: {
  title: string
  subtitle?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 shadow-sm ${className ?? ''}`}>
      <h3 className="text-sm font-medium">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  )
}

// ============ Tarefas tab ============
function TarefasTab({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation(['dashboards', 'common'])
  const format = useFormat()
  const { data, isPending } = useTaskReport(from, to)
  const { data: heatmap, isPending: heatmapPending } = useTaskHeatmap(from, to)

  if (isPending || !data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">{t('common:states.loading')}</div>
  }

  const weeklyCompletedSpark = data.weekly.map((w) => w.completed)
  const weeklyNetSpark = data.weekly.map((w) => w.completed - w.created)

  return (
    <div className="space-y-8">
      {/* Stat-tile row */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight">{t('tasks.highlights.heading')}</h2>
          <p className="hidden text-xs text-muted-foreground sm:block">{t('tasks.highlights.deltaCaption')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t('tasks.stats.completed')}
            icon={CheckCircle2}
            value={data.completedCount}
            delta={data.completedDelta}
            deltaGood="up"
            caption={t('tasks.stats.completedCaption')}
            sparkline={weeklyCompletedSpark}
          />
          <StatTile
            label={t('tasks.stats.netFlow')}
            icon={ArrowLeftRight}
            value={data.netFlow > 0 ? `+${data.netFlow}` : data.netFlow}
            delta={data.netFlowDelta}
            deltaGood="up"
            caption={t('tasks.stats.netFlowCaption')}
            sparkline={weeklyNetSpark}
          />
          <StatTile
            label={t('tasks.stats.overdue')}
            icon={AlarmClockOff}
            value={data.overdueOpenCount}
            delta={data.overdueDelta}
            deltaGood="down"
            caption={t('tasks.stats.overdueCaption', { value: fmtDays(data.overdueOldestDays, t, format) })}
          />
          <StatTile
            label={t('tasks.stats.cycleTime')}
            icon={Timer}
            value={data.cycleTimeMedianDays === null ? t('tasks.stats.cycleTimeEmpty') : fmtDays(data.cycleTimeMedianDays, t, format, { maximumFractionDigits: 1 })}
            delta={data.cycleTimeDelta}
            deltaGood="down"
            caption={t('tasks.stats.cycleTimeCaption')}
          />
        </div>
      </section>

      {/* Fluxo de tarefas */}
      <section>
        <SectionHeading icon={GitBranch}>{t('tasks.flowSection.heading')}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">{t('tasks.flowSection.weeklyChart.title')}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('tasks.flowSection.weeklyChart.subtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Swatch color={AMBER} label={t('tasks.flowSection.weeklyChart.createdLabel')} />
                <Swatch color={BLUE} label={t('tasks.flowSection.weeklyChart.completedLabel')} />
              </div>
            </div>
            <div className="mt-4">
              <WeeklyFlowChart weekly={data.weekly} />
            </div>
          </div>

          <Panel title={t('tasks.flowSection.categoryDonut.title')} subtitle={t('tasks.flowSection.categoryDonut.subtitle')}>
            <CategoryDonut data={data.openByCategory} />
          </Panel>

          <Panel title={t('tasks.flowSection.agingWip.title')} subtitle={t('tasks.flowSection.agingWip.subtitle')}>
            <AgingWipList items={data.agingWip} />
          </Panel>
        </div>
      </section>

      {/* Prazos */}
      <section>
        <SectionHeading icon={CalendarClock}>{t('tasks.dueSection.heading')}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">{t('tasks.dueSection.dueSoon.title')}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('tasks.dueSection.dueSoon.subtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Swatch color={RED} label={t('tasks.dueSection.dueSoon.overdueSwatch')} />
                <Swatch color={BLUE} label={t('tasks.dueSection.dueSoon.upcomingSwatch')} />
              </div>
            </div>
            <div className="mt-4">
              <DueSoonChart dueSoon={data.dueSoon} overdue={data.overdueOpenCount} />
            </div>
          </div>

          <Panel title={t('tasks.dueSection.noDueDate.title')} subtitle={t('tasks.dueSection.noDueDate.subtitle')}>
            <NoDueDateRing data={data.noDueDate} />
          </Panel>

          <div className="rounded-xl border bg-card p-4 shadow-sm xl:col-span-2">
            <div className="flex items-center gap-2">
              <CalendarX className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-medium">{t('tasks.dueSection.onTimeRate.title')}</h3>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('tasks.dueSection.onTimeRate.subtitle')}</p>
            <div className="mt-4">
              <OnTimeRate data={data.onTimeRate} />
            </div>
          </div>

          <Panel title={t('tasks.dueSection.overdueHistogram.title')} subtitle={t('tasks.dueSection.overdueHistogram.subtitle')}>
            <OverdueHistogram data={data.overdueByAgeBucket} />
          </Panel>
        </div>
      </section>

      {/* Heatmap */}
      <section>
        <SectionHeading icon={Grid3x3}>{t('tasks.heatmap.heading')}</SectionHeading>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-medium">{t('tasks.heatmap.title')}</h3>
          {heatmapPending || !heatmap ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t('common:states.loading')}</div>
          ) : (
            <div className="mt-3">
              <TaskHeatmap data={heatmap} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ============ Consistência diária (daily line + 7d moving average + ref) ============
function ConsistencyChart({
  data,
  reference,
}: {
  data: HabitReport['dailyConsistency']
  reference: number
}) {
  const { t } = useTranslation('dashboards')
  const { dayMonth } = useFormat()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  if (data.length < 2) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('charts.noData')}</p>
  }

  const W = 560
  const H = 200
  const padL = 26
  const padR = 8
  const padT = 10
  const padB = 22
  const n = data.length
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const X = (i: number) => padL + (i / (n - 1)) * plotW
  const Y = (v: number) => padT + plotH - (v / 100) * plotH

  // 7-day trailing moving average, computed on the frontend.
  const ma = data.map((_, i) => {
    const win = data.slice(Math.max(0, i - 6), i + 1)
    return win.reduce((a, b) => a + b.pct, 0) / win.length
  })

  const dailyLine = data.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(d.pct).toFixed(1)}`).join(' ')
  const maLine = ma.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
  const rings = [0, 25, 50, 75, 100]
  const labelEvery = Math.ceil(n / 8)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - padL) / plotW) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {rings.map((val) => {
          const y = Y(val)
          return (
            <g key={val}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={padL - 5} y={y + 3} textAnchor="end" fill={MUTED} fontSize={9}>
                {val}
              </text>
            </g>
          )
        })}

        {/* period-average reference line */}
        <line
          x1={padL}
          y1={Y(reference)}
          x2={W - padR}
          y2={Y(reference)}
          stroke={MUTED}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text x={W - padR} y={Y(reference) - 4} textAnchor="end" fill={MUTED} fontSize={9}>
          {t('habits.consistencySection.chart.averageLabel', { value: reference })}
        </text>

        {/* x labels (sparse) */}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={d.date} x={X(i)} y={H - 6} textAnchor="middle" fill={MUTED} fontSize={9}>
              {dayMonth(parseLocalDate(d.date))}
            </text>
          ) : null,
        )}

        {/* raw daily — recessive accent */}
        <path d={dailyLine} fill="none" stroke={BLUE} strokeWidth={1} opacity={0.25} />
        {data.map((d, i) => (
          <circle key={i} cx={X(i)} cy={Y(d.pct)} r={1.5} fill={BLUE} opacity={0.4} />
        ))}

        {/* moving average — stronger accent */}
        <path
          d={maLine}
          fill="none"
          stroke={BLUE}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hover !== null && (
          <g pointerEvents="none">
            <line x1={X(hover)} y1={padT} x2={X(hover)} y2={padT + plotH} stroke={MUTED} strokeWidth={1} opacity={0.4} />
            <circle cx={X(hover)} cy={Y(data[hover].pct)} r={3} fill={BLUE} />
            <circle cx={X(hover)} cy={Y(ma[hover])} r={3} fill={BLUE} stroke="hsl(var(--card))" strokeWidth={1} />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border bg-popover px-2 py-1 text-xs text-popover-foreground shadow"
          style={{ left: `${(X(hover) / W) * 100}%`, top: `${(Y(Math.max(data[hover].pct, ma[hover])) / H) * 100}%` }}
        >
          <div className="font-medium">{dayMonth(parseLocalDate(data[hover].date))}</div>
          <div className="text-muted-foreground">
            {t('habits.consistencySection.chart.tooltip', { pct: data[hover].pct, avg: Math.round(ma[hover]) })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Sequência por hábito (current vs best) ============
function StreaksList({ items }: { items: HabitReport['perHabitStreaks'] }) {
  const { t } = useTranslation('dashboards')
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('habits.consistencySection.streaks.empty')}</p>
  }
  const max = Math.max(1, ...items.map((i) => i.best))
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const broken = it.current === 0
        const bestW = (it.best / max) * 100
        const curW = (it.current / max) * 100
        return (
          <div key={it.habitId}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex min-w-0 items-center gap-1.5 truncate">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.color }} />
                <span className="truncate">{it.name}</span>
              </span>
              <span className={`ml-2 shrink-0 tabular-nums ${broken ? 'text-red-500' : 'text-muted-foreground'}`}>
                {t('habits.consistencySection.streaks.current')} <span className="font-medium text-foreground">{it.current}</span> ·{' '}
                {t('habits.consistencySection.streaks.record')} <span className="font-medium text-foreground">{it.best}</span>
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              {/* best (recorde) — recessive track in the habit hue */}
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${bestW}%`, background: it.color, opacity: 0.25 }} />
              {/* current — solid */}
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.max(broken ? 0 : 2, curW)}%`, background: broken ? RED : it.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============ Hábitos tab ============
function HabitosTab({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation(['dashboards', 'common'])
  const { data, isPending } = useHabitReport(from, to)
  const { data: stats, isPending: statsPending } = useHabitStats(from, to)
  const { data: heatmap, isPending: heatmapPending } = useHabitHeatmap(from, to)

  if (isPending || !data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">{t('common:states.loading')}</div>
  }

  const consistencySpark = data.dailyConsistency.map((d) => d.pct)

  return (
    <div className="space-y-8">
      {/* Stat-tile row */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight">{t('habits.highlights.heading')}</h2>
          <p className="hidden text-xs text-muted-foreground sm:block">{t('tasks.highlights.deltaCaption')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={t('habits.stats.perfectDays')}
            icon={Flame}
            value={data.perfectDays}
            caption={t('habits.stats.perfectDaysCaption', { current: data.currentPerfectStreak, record: data.recordPerfectStreak })}
          />
          <StatTile
            label={t('habits.stats.consistency')}
            icon={LineChart}
            value={`${data.consistencyPct}%`}
            delta={data.consistencyDelta}
            deltaLabel="pp"
            deltaGood="up"
            caption={t('habits.stats.consistencyCaption')}
            sparkline={consistencySpark}
          />
          <StatTile
            label={t('habits.stats.avgAdherence')}
            icon={Target}
            value={`${data.avgAdherence}%`}
            caption={t('habits.stats.avgAdherenceCaption')}
          />
          <StatTile
            label={t('habits.stats.activeHabits')}
            icon={Repeat}
            value={data.activeHabitsCount}
            caption={t('habits.stats.activeHabitsCaption')}
          />
        </div>
      </section>

      {/* Consistência & aderência */}
      <section>
        <SectionHeading icon={Repeat}>{t('habits.consistencySection.heading')}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">{t('habits.consistencySection.chart.title')}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('habits.consistencySection.chart.subtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="18" height="8" aria-hidden>
                    <line x1="0" y1="4" x2="18" y2="4" stroke={BLUE} strokeWidth={2.5} />
                  </svg>
                  {t('habits.consistencySection.chart.movingAverageLegend')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="18" height="8" aria-hidden>
                    <line x1="0" y1="4" x2="18" y2="4" stroke={BLUE} strokeWidth={1} opacity={0.4} />
                  </svg>
                  {t('habits.consistencySection.chart.dailyLegend')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg width="18" height="8" aria-hidden>
                    <line x1="0" y1="4" x2="18" y2="4" stroke={MUTED} strokeWidth={1} strokeDasharray="4 4" />
                  </svg>
                  {t('habits.consistencySection.chart.averageLegend')}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <ConsistencyChart data={data.dailyConsistency} reference={data.consistencyPct} />
            </div>
          </div>

          <Panel title={t('habits.consistencySection.radar.title')} subtitle={t('habits.consistencySection.radar.subtitle')}>
            {statsPending || !stats ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{t('common:states.loading')}</div>
            ) : (
              <HabitRadar habits={stats.habits} />
            )}
          </Panel>

          <Panel
            title={t('habits.consistencySection.streaks.title')}
            subtitle={t('habits.consistencySection.streaks.subtitle')}
          >
            <StreaksList items={data.perHabitStreaks} />
          </Panel>
        </div>
      </section>

      {/* Heatmap */}
      <section>
        <SectionHeading icon={Grid3x3}>{t('habits.heatmap.heading')}</SectionHeading>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-medium">{t('habits.heatmap.title')}</h3>
          {heatmapPending || !heatmap ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t('common:states.loading')}</div>
          ) : (
            <div className="mt-3">
              <HabitHeatmap data={heatmap} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ============ Cérebro: funil de status ============
const BRAIN_STATUS: { key: keyof BrainReport['statuses']; color: string }[] = [
  { key: 'novo', color: BLUE },
  { key: 'estudando', color: AMBER },
  { key: 'a-revisar', color: RED },
  { key: 'concluido', color: '#10b981' },
  { key: 'sem-status', color: SLATE },
]

// Rótulo de cada status: os quatro status reais de nota vêm do namespace `brain`
// (mesmas chaves usadas no resto do app); "sem-status" é específico deste funil.
function statusLabel(key: keyof BrainReport['statuses'], t: TFunction<['dashboards', 'brain']>): string {
  return key === 'sem-status' ? t('dashboards:brain.pipelineSection.statusFunnel.noStatus') : t(`brain:status.${key}`)
}

function StatusFunnel({ statuses }: { statuses: BrainReport['statuses'] }) {
  const { t } = useTranslation(['dashboards', 'brain'])
  const max = Math.max(1, ...BRAIN_STATUS.map((s) => statuses[s.key]))
  const total = BRAIN_STATUS.reduce((a, s) => a + statuses[s.key], 0)
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('dashboards:brain.pipelineSection.statusFunnel.empty')}</p>
  }
  return (
    <div className="space-y-3">
      {BRAIN_STATUS.map((s) => {
        const v = statuses[s.key]
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{statusLabel(s.key, t)}</span>
              <span className="tabular-nums font-medium">{v}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${(v / max) * 100}%`, background: s.color, opacity: s.key === 'sem-status' ? 0.5 : 0.9 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============ Cérebro: volume por categoria ============
function CategoryVolumeBars() {
  const { t } = useTranslation('dashboards')
  const { data } = useBrainCategories()
  const categories = data?.data ?? []
  if (categories.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('brain.pipelineSection.categoryVolume.empty')}</p>
  }
  const max = Math.max(1, ...categories.map((c) => c.total))
  return (
    <div className="space-y-3">
      {[...categories].sort((a, b) => b.total - a.total).map((c) => (
        <div key={c.name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <DynamicIcon name={c.icon} className="h-3 w-3 shrink-0" style={{ color: c.color }} />
              <span className="truncate">{c.name}</span>
            </span>
            <span className="ml-2 shrink-0 tabular-nums font-medium">{c.total}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(c.total / max) * 100}%`, background: c.color, opacity: 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ Cérebro: atividade de escrita por semana (criadas vs atualizadas) ============
function WritingActivityChart({ weekly }: { weekly: BrainReport['weekly'] }) {
  const { t } = useTranslation('dashboards')
  const { dayMonth } = useFormat()
  if (weekly.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('charts.noData')}</p>
  }
  const W = 560
  const H = 200
  const padL = 26
  const padR = 8
  const padT = 12
  const padB = 26
  const n = weekly.length
  const max = Math.max(1, ...weekly.map((w) => Math.max(w.created, w.updated)))
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const groupW = plotW / n
  const barW = Math.min(14, groupW * 0.32)
  const gap = groupW * 0.06
  const Y = (v: number) => padT + plotH - (v / max) * plotH
  const labelEvery = Math.ceil(n / 12)
  const ticks = [0, Math.round(max / 2), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {ticks.map((val, i) => {
        const y = Y(val)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fill={MUTED} fontSize={9}>{val}</text>
          </g>
        )
      })}
      {weekly.map((w, i) => {
        const gx = padL + i * groupW
        const x1 = gx + groupW / 2 - barW - gap / 2
        const x2 = gx + groupW / 2 + gap / 2
        const weekLabel = dayMonth(parseLocalDate(w.weekStart))
        return (
          <g key={w.weekStart}>
            <title>
              {t('brain.activitySection.writingChart.tooltip', { date: weekLabel, created: w.created, updated: w.updated })}
            </title>
            <rect x={x1} y={Y(w.created)} width={barW} height={padT + plotH - Y(w.created)} rx={2} fill={BLUE} />
            <rect x={x2} y={Y(w.updated)} width={barW} height={padT + plotH - Y(w.updated)} rx={2} fill={SLATE} opacity={0.75} />
            {i % labelEvery === 0 && (
              <text x={gx + groupW / 2} y={H - 8} textAnchor="middle" fill={MUTED} fontSize={9}>
                {weekLabel}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ============ Cérebro: idade do backlog do inbox ============
function InboxBacklogChart({ weekly, pending }: { weekly: BrainReport['inboxWeekly']; pending: number }) {
  const { t } = useTranslation('dashboards')
  const { dayMonth } = useFormat()
  if (pending === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('brain.activitySection.inboxBacklog.empty')}</p>
  }
  const withData = weekly.filter((w) => w.entered > 0)
  if (withData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t('brain.activitySection.inboxBacklog.outOfWindow', { count: pending })}
      </p>
    )
  }
  const max = Math.max(1, ...weekly.map((w) => w.entered))
  return (
    <div className="space-y-3">
      {weekly.map((w) =>
        w.entered === 0 ? null : (
          <div key={w.weekStart}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('charts.weekOf', { date: dayMonth(parseLocalDate(w.weekStart)) })}</span>
              <span className="tabular-nums font-medium">{w.entered}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${(w.entered / max) * 100}%`, background: AMBER }} />
            </div>
          </div>
        ),
      )}
    </div>
  )
}

// ============ Cérebro tab ============
function CerebroTab({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation(['dashboards', 'common'])
  const { data, isPending } = useBrainReport(from, to)

  if (isPending || !data) {
    return <div className="p-8 text-center text-sm text-muted-foreground">{t('common:states.loading')}</div>
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight">{t('brain.highlights.heading')}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label={t('brain.stats.notes')} icon={NotebookPen} value={data.totals.notes} caption={t('brain.stats.notesCaption')} />
          <StatTile label={t('brain.stats.studying')} icon={PenLine} value={data.totals.estudando} caption={t('brain.stats.studyingCaption')} />
          <StatTile label={t('brain.stats.done')} icon={CheckCircle2} value={data.totals.concluidas} caption={t('brain.stats.doneCaption')} />
          <StatTile
            label={t('brain.stats.inbox')}
            icon={Inbox}
            value={data.totals.inbox}
            caption={data.totals.inbox === 0 ? t('brain.stats.inboxCaptionEmpty') : t('brain.stats.inboxCaption')}
          />
        </div>
      </section>

      <section>
        <SectionHeading icon={Brain}>{t('brain.pipelineSection.heading')}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title={t('brain.pipelineSection.statusFunnel.title')} subtitle={t('brain.pipelineSection.statusFunnel.subtitle')}>
            <StatusFunnel statuses={data.statuses} />
          </Panel>
          <Panel title={t('brain.pipelineSection.categoryVolume.title')} subtitle={t('brain.pipelineSection.categoryVolume.subtitle')}>
            <CategoryVolumeBars />
          </Panel>
        </div>
      </section>

      <section>
        <SectionHeading icon={PenLine}>{t('brain.activitySection.heading')}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">{t('brain.activitySection.writingChart.title')}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('brain.activitySection.writingChart.subtitle')}</p>
              </div>
              <div className="flex gap-4">
                <Swatch color={BLUE} label={t('brain.activitySection.writingChart.createdLabel')} />
                <Swatch color={SLATE} label={t('brain.activitySection.writingChart.updatedLabel')} />
              </div>
            </div>
            <div className="mt-4">
              <WritingActivityChart weekly={data.weekly} />
            </div>
          </div>
          <Panel
            title={t('brain.activitySection.inboxBacklog.title')}
            subtitle={t('brain.activitySection.inboxBacklog.subtitle', { count: data.totals.inbox })}
          >
            <InboxBacklogChart weekly={data.inboxWeekly} pending={data.totals.inbox} />
          </Panel>
        </div>
      </section>
    </div>
  )
}

export default function Dashboards() {
  const { t } = useTranslation(['dashboards', 'common'])
  const [period, setPeriod] = useState<string>('30d')
  const { from, to } = useMemo(() => rangeForDays(daysForKey(period)), [period])
  const { isEnabled } = useEnabledModules()
  const tasksEnabled = isEnabled('tasks')
  const habitsEnabled = isEnabled('habits')
  const brainEnabled = isEnabled('brain')
  // A rota (ReportsRoute) garante que ao menos um módulo relevante está habilitado.
  // Ordem: hábitos -> tarefas -> cérebro; padrão é a primeira aba habilitada.
  const defaultTab = habitsEnabled ? 'habitos' : tasksEnabled ? 'tarefas' : 'cerebro'

  const [tab, setTab] = useState<string>(defaultTab)

  return (
    <AppLayout title={t('common:nav.dashboards')}>
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1400px] space-y-6">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                {habitsEnabled && (
                  <TabsTrigger value="habitos">
                    <Repeat className="h-3.5 w-3.5" /> {t('common:nav.habits')}
                  </TabsTrigger>
                )}
                {tasksEnabled && (
                  <TabsTrigger value="tarefas">
                    <Kanban className="h-3.5 w-3.5" /> {t('common:nav.tasks')}
                  </TabsTrigger>
                )}
                {brainEnabled && (
                  <TabsTrigger value="cerebro">
                    <Brain className="h-3.5 w-3.5" /> {t('common:nav.brain')}
                  </TabsTrigger>
                )}
              </TabsList>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('dashboards:periodLabel')}</span>
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>

            {habitsEnabled && (
              <TabsContent value="habitos" className="mt-6">
                <HabitosTab from={from} to={to} />
              </TabsContent>
            )}

            {tasksEnabled && (
              <TabsContent value="tarefas" className="mt-6">
                <TarefasTab from={from} to={to} />
              </TabsContent>
            )}

            {brainEnabled && (
              <TabsContent value="cerebro" className="mt-6">
                <CerebroTab from={from} to={to} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </AppLayout>
  )
}
