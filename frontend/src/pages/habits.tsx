import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Archive, RotateCcw, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HabitDialog } from '@/components/habit-dialog'
import { DynamicIcon } from '@/components/icon'
import {
  useHabits,
  useHabitSummary,
  useToggleHabit,
  useUnarchiveHabit,
} from '@/hooks/use-habits'
import { mondayOf } from '@/components/week-stepper-utils'
import { localDateString } from '@/lib/dates'
import type { Habit, AnyHabitSummary } from '@/types/api'

function ProgressRing({ done, total, size = 64 }: { done: number; total: number; size?: number }) {
  const radius = size / 2 - 4
  const circumference = 2 * Math.PI * radius
  const pct = total > 0 ? done / total : 0
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} className="stroke-muted" strokeWidth={4} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={radius} className="stroke-primary" strokeWidth={4} fill="none"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)} strokeLinecap="round" />
      <text x={size / 2} y={size / 2} transform={`rotate(90 ${size / 2} ${size / 2})`}
        textAnchor="middle" dominantBaseline="central" className="rotate-90 fill-foreground text-sm font-semibold">
        {done}/{total}
      </text>
    </svg>
  )
}

function HabitListRow({ habit, summary, onToggle, onOpen }: {
  habit: Habit
  summary: AnyHabitSummary | undefined
  onToggle: () => void
  onOpen: () => void
}) {
  const today = localDateString(new Date())
  const doneToday = summary?.type === 'positive' ? summary.days.find((d) => d.date === today)?.done ?? false : false

  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-3">
      {habit.type === 'positive' ? (
        <button
          onClick={onToggle}
          aria-pressed={doneToday}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${doneToday ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}
        >
          <DynamicIcon name={habit.icon} className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30">
          <DynamicIcon name={habit.icon} className="h-4 w-4" />
        </div>
      )}
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${doneToday ? 'text-muted-foreground line-through' : ''}`}>{habit.name}</p>
          {summary?.type === 'negative' && (
            <p className="truncate text-xs text-muted-foreground">{summary.dias_sem} dias sem</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  )
}

export default function Habits() {
  const { t } = useTranslation(['common', 'habits'])
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

  const positives = habits.filter((h) => h.type === 'positive')
  const dailyHabits = positives.filter((h) => !h.target_per_week || h.target_per_week >= 7)
  const flexibleHabits = positives.filter((h) => h.target_per_week && h.target_per_week < 7)
  const negativeHabits = habits.filter((h) => h.type === 'negative')

  const doneToday = dailyHabits.filter((h) => {
    const s = summaryByHabit.get(h.id)
    return s?.type === 'positive' && s.days.find((d) => d.date === today)?.done
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
            <div className="flex items-center justify-between gap-3 md:hidden">
              <ProgressRing done={doneToday} total={dailyHabits.length || 1} />
              <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />{t('habits:newHabit')}</Button>
            </div>
            <Section title={t('habits:sections.today')} items={dailyHabits} />
            <Section title={t('habits:sections.whenPossible')} items={flexibleHabits} />
            <Section title={t('habits:sections.quitting')} items={negativeHabits} />
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
          <Card className="hidden h-fit flex-col items-center gap-4 p-6 md:order-2 md:flex md:sticky md:top-6">
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
