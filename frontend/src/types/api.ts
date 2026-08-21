export type TaskStatus = 'todo' | 'doing' | 'done'

// --- Módulos (GET /api/modules) ---


export interface ModuleInfo {
  key: ModuleKey
  label: string
  description: string
  icon: string
  version: string
  enabled: boolean
}


  configured: boolean
  base_url: string | null
  email: string | null
  enabled: boolean
  hasPassword: boolean
  last_status: string | null
  last_checked_at: string | null
}

export interface Category {
  id: number
  name: string
  color: string
  icon: string
  position: number
}

export interface Subtask {
  id: number
  title: string
  done: boolean
  position: number
}

export interface Task {
  id: number
  title: string
  notes: string | null
  status: TaskStatus
  position: number
  category_id: number | null
  due_date: string | null
  is_priority: boolean
  subtasks?: Subtask[]
  subtasks_count?: number
  subtasks_done_count?: number
}

export interface Habit {
  id: number
  name: string
  icon: string
  target_per_week: number | null
  color: string
  archived_at: string | null
}

export interface HabitDay {
  date: string
  done: boolean
  skipped: boolean
}

export interface HabitSummary {
  habit_id: number
  target_per_week: number | null
  done_count: number
  streak: number
  days: HabitDay[]
}

export interface TaskHeatmap {
  from: string
  to: string
  counts: Record<string, number>
  total: number
}

export interface HabitHeatmap {
  from: string
  to: string
  counts: Record<string, number>
  total: number
}

export interface HabitStat {
  habit_id: number
  name: string
  color: string
  icon: string
  target_per_week: number | null
  done_count: number
  expected: number
  rate: number
}

export interface HabitStats {
  from: string
  to: string
  period_days: number
  habits: HabitStat[]
}

// --- Relatórios > Tarefas report (GET /api/reports/tasks) ---

export interface TaskReportWeek {
  weekStart: string
  created: number
  completed: number
}

export interface TaskReportCategory {
  categoryId: number | null
  name: string | null
  color: string | null
  open: number
}

export interface TaskReportAgingItem {
  id: number
  title: string
  categoryColor: string | null
  days: number
}

export interface TaskReportDueSoon {
  date: string
  count: number
}

export interface TaskReportOnTimeRate {
  rate: number
  onTime: number
  total: number
  previousRate: number
}

export interface TaskReportOverdueByAgeBucket {
  '1-3': number
  '4-7': number
  '8-30': number
  '30+': number
}

export interface TaskReportNoDueDate {
  pct: number
  count: number
  total: number
}

// --- Relatórios > Hábitos report (GET /api/reports/habits) ---

export interface HabitReportDailyConsistency {
  date: string
  pct: number
}

export interface HabitReportStreak {
  habitId: number
  name: string
  color: string
  current: number
  best: number
}

export interface HabitReport {
  from: string
  to: string
  tz: string
  periodDays: number
  previous: { from: string; to: string }
  activeHabitsCount: number
  avgAdherence: number
  consistencyPct: number
  consistencyPreviousPct: number
  consistencyDelta: number
  perfectDays: number
  currentPerfectStreak: number
  recordPerfectStreak: number
  dailyConsistency: HabitReportDailyConsistency[]
  perHabitStreaks: HabitReportStreak[]
}


// Totais de um período (atual ou anterior). Números inteiros podem chegar como
  net: number
}

  // null quando o total anterior é 0 (variação percentual indefinida).
  // pontos percentuais na taxa de poupança (sempre definido).
}

  // Mês no formato "YYYY-MM".
  date: string
  net: number
}

  // linhas sem id não são clicáveis (não há como buscar suas transações).
  id: string | null
  name: string
  color: string
  total: number
  percentage: number
  previousTotal: number
  // null quando previousTotal === 0 (categoria nova).
  deltaPct: number | null
}


  id: string
  // "YYYY-MM-DD".
  date: string
  description: string
  payee: string | null
  amount: number
}

  categoryId: string
  from: string
  to: string
  currency: string
  count: number
  total: number
}


// or a deficit bullet must read as bad/alert even inside a period that's
// otherwise fine, and vice-versa.

  text: string
}

  headline: string
}

  currency: string
  from: string
  to: string
  previous: { from: string; to: string }
  // dias) e quais deles compõem a janela atual/anterior ("YYYY-MM", asc) —
  // gráficos mensais, os mesmos meses cujo total aparece nos cards.
}

export interface TaskReport {
  from: string
  to: string
  tz: string
  periodDays: number
  previous: { from: string; to: string }
  completedCount: number
  completedDelta: number
  createdCount: number
  netFlow: number
  netFlowDelta: number
  overdueOpenCount: number
  overdueDelta: number
  overdueOldestDays: number
  cycleTimeMedianDays: number | null
  cycleTimePreviousMedianDays: number | null
  cycleTimeDelta: number | null
  weekly: TaskReportWeek[]
  openByCategory: TaskReportCategory[]
  agingWip: TaskReportAgingItem[]
  dueSoon: TaskReportDueSoon[]
  onTimeRate: TaskReportOnTimeRate
  overdueByAgeBucket: TaskReportOverdueByAgeBucket
  noDueDate: TaskReportNoDueDate
}
