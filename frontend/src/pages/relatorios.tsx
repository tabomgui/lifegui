import { useMemo, useState } from 'react'
import {
  Brain,
  CircleAlert,
  CircleCheck,
  CircleX,
  Flame,
  Kanban,
  Repeat,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { PeriodFilter, PERIODS, rangeForDays } from '@/components/period-filter'
import { useTaskReport, useHabitReport } from '@/hooks/use-reports'
import { useBrainCategories, useBrainInbox } from '@/hooks/use-brain'
import { useEnabledModules } from '@/hooks/use-modules'

// Um veredito por área: verde = seguir em frente, âmbar = merece um olhar,
// vermelho = agir. É a única "métrica" que a página promete de relance.
type Verdict = 'ok' | 'warn' | 'bad'

const VERDICT = {
  ok: { label: 'Em dia', icon: CircleCheck, text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  warn: { label: 'Atenção', icon: CircleAlert, text: 'text-amber-500', bg: 'bg-amber-500/10' },
  bad: { label: 'Agir', icon: CircleX, text: 'text-red-500', bg: 'bg-red-500/10' },
} as const

function daysForKey(key: string): number {
  return (PERIODS.find((p) => p.key === key) ?? PERIODS[1]).days
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict]
  const Icon = v.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${v.bg} ${v.text}`}>
      <Icon className="h-3 w-3" /> {v.label}
    </span>
  )
}

function AreaCard({ icon: Icon, title, verdict, value, caption, lines, extra }: {
  icon: typeof Kanban
  title: string
  verdict: Verdict
  value: string
  caption: string
  lines: string[]
  extra?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </span>
        <VerdictBadge verdict={verdict} />
      </div>
      <div className="mt-4">
        <div className="text-4xl font-semibold tabular-nums tracking-tight">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      </div>
      {extra}
      <div className="mt-4 space-y-1 border-t pt-3">
        {lines.map((line) => (
          <p key={line} className="text-xs text-muted-foreground">{line}</p>
        ))}
      </div>
    </div>
  )
}

/** Últimos 7 dias de consistência dos hábitos como bolinhas — dá pra "ler" a semana num olhar. */
function WeekDots({ days }: { days: { date: string; pct: number }[] }) {
  const last = days.slice(-7)
  if (last.length === 0) return null
  return (
    <div className="mt-4 flex items-center gap-1.5">
      {last.map((d) => (
        <span
          key={d.date}
          title={`${d.date}: ${d.pct}%`}
          className={`h-2.5 w-2.5 rounded-full ${
            d.pct >= 100 ? 'bg-emerald-500' : d.pct > 0 ? 'bg-amber-500' : 'bg-muted'
          }`}
        />
      ))}
      <span className="ml-1.5 text-[11px] text-muted-foreground">últimos 7 dias</span>
    </div>
  )
}

export default function Relatorios() {
  const [period, setPeriod] = useState<string>('30d')
  const { from, to } = useMemo(() => rangeForDays(daysForKey(period)), [period])
  const { isEnabled } = useEnabledModules()
  const tasksEnabled = isEnabled('tasks')
  const habitsEnabled = isEnabled('habits')
  const brainEnabled = isEnabled('brain')

  const { data: tasks } = useTaskReport(from, to, tasksEnabled)
  const { data: habits } = useHabitReport(from, to, habitsEnabled)
  const { data: brainCategories } = useBrainCategories(brainEnabled)
  const { data: inbox } = useBrainInbox(brainEnabled && (brainCategories?.initialized ?? false))

  // --- vereditos por área ---
  const habitsVerdict: Verdict | null = habits
    ? habits.consistencyPct >= 70 ? 'ok' : habits.consistencyPct >= 40 ? 'warn' : 'bad'
    : null
  const tasksVerdict: Verdict | null = tasks
    ? tasks.overdueOpenCount === 0 ? 'ok' : tasks.overdueOpenCount <= 3 ? 'warn' : 'bad'
    : null
  const inboxCount = inbox?.data.length ?? 0
  const toReview = (brainCategories?.data ?? []).reduce((sum, c) => sum + (c.counts['a-revisar'] ?? 0), 0)
  const brainVerdict: Verdict | null = brainCategories
    ? inboxCount === 0 ? 'ok' : inboxCount <= 5 ? 'warn' : 'bad'
    : null

  const verdicts = [habitsVerdict, tasksVerdict, brainVerdict].filter((v): v is Verdict => v !== null)
  const worst: Verdict = verdicts.includes('bad') ? 'bad' : verdicts.includes('warn') ? 'warn' : 'ok'
  const attention = verdicts.filter((v) => v !== 'ok').length
  const headline = worst === 'ok'
    ? 'Tudo em dia. Segue o jogo.'
    : attention === 1
      ? 'Quase lá — uma área pede atenção.'
      : `${attention} áreas pedem atenção.`

  const HeadIcon = VERDICT[worst].icon

  return (
    <AppLayout title="Relatórios">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <HeadIcon className={`h-6 w-6 ${VERDICT[worst].text}`} />
              <h2 className="text-lg font-semibold tracking-tight">{headline}</h2>
            </div>
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {habitsEnabled && habits && habitsVerdict && (
              <AreaCard
                icon={Repeat}
                title="Hábitos"
                verdict={habitsVerdict}
                value={`${habits.consistencyPct}%`}
                caption="do que você se propôs, você fez"
                extra={<WeekDots days={habits.dailyConsistency} />}
                lines={[
                  `Sequência de dias perfeitos: ${habits.currentPerfectStreak} (recorde ${habits.recordPerfectStreak})`,
                  `${habits.perfectDays} dias perfeitos no período`,
                ]}
              />
            )}

            {tasksEnabled && tasks && tasksVerdict && (
              <AreaCard
                icon={Kanban}
                title="Tarefas"
                verdict={tasksVerdict}
                value={String(tasks.completedCount)}
                caption="concluídas no período"
                lines={[
                  tasks.overdueOpenCount === 0
                    ? 'Nenhuma tarefa atrasada'
                    : `${tasks.overdueOpenCount} atrasada${tasks.overdueOpenCount > 1 ? 's' : ''} — a mais antiga há ${tasks.overdueOldestDays}d`,
                  tasks.netFlow >= 0
                    ? 'Você conclui mais do que cria'
                    : `Backlog cresceu ${Math.abs(tasks.netFlow)} no período`,
                ]}
              />
            )}

            {brainEnabled && brainCategories && brainVerdict && (
              <AreaCard
                icon={Brain}
                title="Cérebro"
                verdict={brainVerdict}
                value={String(inboxCount)}
                caption={inboxCount === 1 ? 'captura esperando no inbox' : 'capturas esperando no inbox'}
                lines={[
                  toReview === 0 ? 'Nada marcado pra revisar' : `${toReview} nota${toReview > 1 ? 's' : ''} marcada${toReview > 1 ? 's' : ''} como "a revisar"`,
                  `${(brainCategories.data ?? []).reduce((sum, c) => sum + c.total, 0)} notas no total`,
                ]}
              />
            )}
          </div>

          {habitsEnabled && habits && habits.currentPerfectStreak >= 3 && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 text-amber-500" />
              {habits.currentPerfectStreak} dias perfeitos seguidos — não quebra a corrente.
            </p>
          )}
        </div>
      </main>
    </AppLayout>
  )
}
