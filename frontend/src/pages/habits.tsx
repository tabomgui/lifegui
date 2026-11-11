import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Archive, RotateCcw, ChevronRight, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HabitDialog } from '@/components/habit-dialog'
import { DynamicIcon } from '@/components/icon'
import { useAuth } from '@/hooks/use-auth'
import { useFormat } from '@/i18n/format'
import {
  useHabits,
  useHabitSummary,
  useToggleHabit,
  useUnarchiveHabit,
} from '@/hooks/use-habits'
import { mondayOf } from '@/components/week-stepper-utils'
import { localDateString } from '@/lib/dates'
import type { Habit, HabitSummary } from '@/types/api'

function ProgressRing({ done, total, size = 64 }: { done: number; total: number; size?: number }) {
  const radius = size / 2 - 4
  const circumference = 2 * Math.PI * radius
  const pct = total > 0 ? done / total : 0
  const c = size / 2
  return (
    <svg width={size} height={size} className="shrink-0">
      <g transform={`rotate(-90 ${c} ${c})`}>
        <circle cx={c} cy={c} r={radius} className="stroke-muted" strokeWidth={4} fill="none" />
        <circle cx={c} cy={c} r={radius} className="stroke-emerald-500" strokeWidth={4} fill="none"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)} strokeLinecap="round" />
      </g>
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-sm font-semibold">
        {done}/{total}
      </text>
    </svg>
  )
}

function HabitListRow({ habit, summary, onToggle, onOpen }: {
  habit: Habit
  summary: HabitSummary | undefined
  onToggle: () => void
  onOpen: () => void
}) {
  const { t } = useTranslation('habits')
  const today = localDateString(new Date())
  const doneToday = summary?.days.find((d) => d.date === today)?.done ?? false
  const tint = { backgroundColor: `${habit.color}22`, color: habit.color }

  const subtitle = summary
    ? (!habit.target_per_week || habit.target_per_week >= 7
        ? t('row.streakDays', { count: summary.streak })
        : t('row.weekProgress', { done: summary.done_count, target: habit.target_per_week }))
    : null

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={onToggle}
        aria-pressed={doneToday}
        style={doneToday ? undefined : tint}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${doneToday ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-transparent'}`}
      >
        {doneToday ? <Check className="h-4 w-4" /> : <DynamicIcon name={habit.icon} className="h-4 w-4" />}
      </button>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${doneToday ? 'text-muted-foreground line-through' : ''}`}>{habit.name}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  )
}

export default function Habits() {
  const { t } = useTranslation(['common', 'habits'])
  const { user } = useAuth()
  const format = useFormat()
  const navigate = useNavigate()
  const week = mondayOf(new Date())
  const { data: habits = [] } = useHabits()
  const { data: summaries = [] } = useHabitSummary(week)
  const toggle = useToggleHabit(week)
  const unarchive = useUnarchiveHabit()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const { data: archived = [] } = useHabits(true, showArchived)

  const summaryByHabit = new Map(summaries.map((s) => [s.habit_id, s]))
  const today = localDateString(new Date())

  const dailyHabits = habits.filter((h) => !h.target_per_week || h.target_per_week >= 7)
  const flexibleHabits = habits.filter((h) => h.target_per_week && h.target_per_week < 7)

  const doneToday = dailyHabits.filter((h) => {
    const s = summaryByHabit.get(h.id)
    return s?.days.find((d) => d.date === today)?.done
  }).length

  function openNew() { setEditing(null); setDialogOpen(true) }

  function toggleToday(habit: Habit) {
    toggle.mutate({ habitId: habit.id, date: today })
  }

  function Section({ title, items }: { title: string; items: Habit[] }) {
    if (items.length === 0) return null
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        <div className="space-y-2">
          {items.map((h) => (
            <HabitListRow key={h.id} habit={h} summary={summaryByHabit.get(h.id)}
              onToggle={() => toggleToday(h)} onOpen={() => navigate(`/habits/${h.id}`)} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <AppLayout title={t('common:nav.habits')}>
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-5 md:order-1">
            <div>
              <h1 className="text-xl font-semibold">
                {t('habits:greeting', { name: user?.name?.split(' ')[0] ?? '' })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {format.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 md:hidden">
              <ProgressRing done={doneToday} total={dailyHabits.length || 1} />
              <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />{t('habits:newHabit')}</Button>
            </div>
            <Section title={t('habits:sections.today')} items={dailyHabits} />
            <Section title={t('habits:sections.whenPossible')} items={flexibleHabits} />
            {habits.length === 0 && (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('habits:empty.noHabits')}
              </div>
            )}
            {archived.length > 0 && (
              <div className="space-y-2 pt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
                  <Archive className="mr-1 h-4 w-4" />{t('habits:toggleArchived')}
                </Button>
                {showArchived && archived.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>{h.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => unarchive.mutate(h.id)}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />{t('habits:restore')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Card className="hidden h-fit flex-col items-center gap-4 p-6 shadow-sm transition-shadow hover:shadow-md md:order-2 md:flex md:sticky md:top-6">
            <ProgressRing done={doneToday} total={dailyHabits.length || 1} size={96} />
            <p className="text-center text-sm text-muted-foreground">{t('habits:todaySummary', { done: doneToday, total: dailyHabits.length })}</p>
            <Button className="w-full" onClick={openNew}><Plus className="mr-1 h-4 w-4" />{t('habits:newHabit')}</Button>
          </Card>
        </div>
      </main>
      <HabitDialog open={dialogOpen} onOpenChange={setDialogOpen} habit={editing} />
    </AppLayout>
  )
}
