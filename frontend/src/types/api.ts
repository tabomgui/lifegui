export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Category {
  id: number
  name: string
  color: string
  icon: string
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
