export type TaskStatus = 'todo' | 'doing' | 'done'

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
}

export interface HabitDay {
  date: string
  done: boolean
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
