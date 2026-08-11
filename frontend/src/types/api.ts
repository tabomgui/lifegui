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
}
