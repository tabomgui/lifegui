export type TaskStatus = 'todo' | 'doing' | 'done'

// --- Módulos (GET /api/modules) ---

export type ModuleKey = 'tasks' | 'habits' | 'brain'

export interface ModuleInfo {
  key: ModuleKey
  label: string
  description: string
  icon: string
  version: string
  enabled: boolean
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
  note_links?: NoteLink[]
}

export interface Habit {
  id: number
  name: string
  icon: string
  target_per_week: number | null
  color: string
  archived_at: string | null
  note_links?: NoteLink[]
}

// --- Módulo Cérebro (vault Obsidian; GET /api/brain/*) ---

export type NoteStatus = 'novo' | 'estudando' | 'concluido' | 'a-revisar'

export interface BrainCategory {
  name: string
  icon: string
  color: string
  counts: Partial<Record<NoteStatus, number>>
  total: number
}

export interface BrainNoteSummary {
  path: string
  title: string
  status: NoteStatus | null
  tags: string[]
  fonte: string | null
  resumo: string | null
  data_salvo: string | null
}

// Task/hábito apontando pra nota (no show da nota).
export interface BrainNoteBacklink {
  id: number
  type: 'task' | 'habit'
  linkable_id: number
  name: string | null
}

export interface BrainNote extends BrainNoteSummary {
  frontmatter: Record<string, unknown>
  body: string
  links: BrainNoteBacklink[]
  // Notas cujo corpo tem [[wikilink]] apontando pra esta.
  backlinks: { path: string; title: string; category: string }[]
}

export interface InboxItem {
  path: string
  title: string
  captured_at: string | null
  preview: string
}

// Vínculo nota↔task/hábito visto do lado da task/hábito.
export interface NoteLink {
  id: number
  note_path: string
  title: string
  exists: boolean
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
