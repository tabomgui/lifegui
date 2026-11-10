import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Trash2, Pencil, PiggyBank, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DynamicIcon } from '@/components/icon'
import { HabitDialog } from '@/components/habit-dialog'
import { HabitHeatmap } from '@/components/habit-heatmap'
import { useHabits, useHabitSummary, useDeleteHabit } from '@/hooks/use-habits'
import { useHabitHeatmap } from '@/hooks/use-heatmap'
import { mondayOf } from '@/components/week-stepper-utils'
import { localDateString } from '@/lib/dates'
import { toast } from 'sonner'

const HEATMAP_WEEKS = 20

function heatmapRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - (HEATMAP_WEEKS * 7 - 1))
  return { from: localDateString(from), to: localDateString(to) }
}

export default function HabitDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation(['common', 'habits'])
  const { data: habits = [] } = useHabits()
  const habit = habits.find((h) => h.id === Number(id))
  const week = mondayOf(new Date())
  const { data: summaries = [] } = useHabitSummary(week)
  const del = useDeleteHabit()
  const [editOpen, setEditOpen] = useState(false)

  const summary = summaries.find((s) => s.habit_id === Number(id))

  async function remove() {
    if (!habit || !confirm(t('habits:confirmDelete', { name: habit.name }))) return
    try { await del.mutateAsync(habit.id); navigate('/habits') } catch { toast.error(t('habits:toast.deleteError')) }
  }

  if (!habit) {
    return (
      <AppLayout title={t('common:nav.habits')}>
        <main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t('habits:notFound')}
        </main>
      </AppLayout>
    )
  }

  return (
    <AppLayout title={habit.name}>
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/habits')}>
              <ArrowLeft className="mr-1 h-4 w-4" />{t('common:actions.back')}
            </Button>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DynamicIcon name={habit.icon} className="h-6 w-6" />
            <h1 className="text-lg font-semibold">{habit.name}</h1>
          </div>

          {habit.type === 'negative' && summary?.type === 'negative' ? (
            <NegativeHabitView summary={summary} dailyCost={habit.estimated_daily_cost} />
          ) : summary?.type === 'positive' ? (
            <PositiveHabitView habitId={habit.id} summary={summary} />
          ) : null}
        </div>
      </main>
      <HabitDialog open={editOpen} onOpenChange={setEditOpen} habit={habit} />
    </AppLayout>
  )
}

function PositiveHabitView({ habitId, summary }: { habitId: number; summary: { streak: number; best: number } }) {
  const { t } = useTranslation('habits')
  const { from, to } = heatmapRange()
  const { data: heatmap } = useHabitHeatmap(from, to, habitId)
  // "Força do hábito": sem fórmula definida ainda — placeholder fixo (não é cálculo real).
  const forcaDoHabito = 80

  return (
    <div className="space-y-5">
      <Card className="flex flex-col items-center gap-2 p-6">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary">
          <span className="text-2xl font-bold">{forcaDoHabito}%</span>
        </div>
        <p className="text-sm font-medium">{t('detail.strength')}</p>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t('detail.currentStreak')} value={summary.streak} />
        <StatTile label={t('detail.best')} value={summary.best} />
        <StatTile label={t('detail.noSlack')} value="—" />
      </div>
      {heatmap && (
        <Card className="p-4">
          <HabitHeatmap data={heatmap} />
        </Card>
      )}
    </div>
  )
}

function NegativeHabitView({ summary, dailyCost }: {
  summary: { dias_sem: number; recorde: number; total_dias_sem: number; recomecos: number; economia: number; marcos: { dias: number; atingido: boolean }[] }
  dailyCost: string | null
}) {
  const { t } = useTranslation('habits')
  const proximoMarco = summary.marcos.find((m) => !m.atingido)

  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-6 text-center">
        <p className="text-4xl font-bold">{summary.dias_sem}</p>
        <p className="text-sm text-muted-foreground">{t('detail.daysWithout')}</p>
        {proximoMarco && (
          <div className="space-y-1">
            <Progress value={(summary.dias_sem / proximoMarco.dias) * 100} />
            <p className="text-xs text-muted-foreground">
              {t('detail.nextMilestone', { days: proximoMarco.dias, remaining: proximoMarco.dias - summary.dias_sem })}
            </p>
          </div>
        )}
      </Card>
      {dailyCost && (
        <Card className="flex items-center gap-3 p-4">
          <PiggyBank className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm">{t('detail.savings', { amount: summary.economia.toFixed(2) })}</p>
        </Card>
      )}
      <Card className="flex items-start gap-3 p-4">
        <Lightbulb className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('detail.whenCraving')}</p>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t('detail.best')} value={summary.recorde} />
        <StatTile label={t('detail.totalDaysWithout')} value={summary.total_dias_sem} />
        <StatTile label={t('detail.relapses')} value={summary.recomecos} />
      </div>
      <div className="flex flex-wrap gap-2">
        {summary.marcos.map((m) => (
          <Badge key={m.dias} variant={m.atingido ? 'default' : 'outline'}>{m.dias} {t('detail.days')}</Badge>
        ))}
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="flex flex-col items-center gap-1 p-3 text-center">
      <span className="text-lg font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </Card>
  )
}
