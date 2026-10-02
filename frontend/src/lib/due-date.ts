export type DueTone = 'overdue' | 'soon' | 'near' | 'week' | 'far'

export type DueDateKey = 'dueDate.overdue' | 'dueDate.today' | 'dueDate.tomorrow' | 'dueDate.inDays' | 'dueDate.onDate'

export interface DueDateMeta {
  key: DueDateKey
  tone: DueTone
  count?: number
  date?: Date
}

// Determinístico, baseado em data LOCAL (não UTC): due vem como 'Y-m-d' puro, sem hora.
// Retorna a chave de tradução (+ params) em vez de texto; quem renderiza chama t(key, params)
// (ou formata `date` com useFormat() no caso 'dueDate.onDate').
export function dueDateMeta(due: string | null): DueDateMeta | null {
  if (!due) return null
  const [y, m, d] = due.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { key: 'dueDate.overdue', count: -days, tone: 'overdue' }
  if (days === 0) return { key: 'dueDate.today', tone: 'soon' }
  if (days === 1) return { key: 'dueDate.tomorrow', tone: 'soon' }
  if (days <= 3) return { key: 'dueDate.inDays', count: days, tone: 'near' }
  if (days <= 7) return { key: 'dueDate.inDays', count: days, tone: 'week' }
  return { key: 'dueDate.onDate', date: target, tone: 'far' }
}

// Data local no formato 'Y-m-d' com deslocamento em dias (0 = hoje, 1 = amanhã, 7 = próx. semana).
export function isoOffset(days = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Verdadeiro quando o prazo é hoje ou já passou (base local, sem hora).
export function isOverdueOrToday(due: string | null): boolean {
  if (!due) return false
  const [y, m, d] = due.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return target.getTime() <= today.getTime()
}

export const TONE_CLASSES: Record<DueTone, string> = {
  overdue: 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  soon: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300',
  near: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  week: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300',
  far: 'border-border bg-muted text-muted-foreground',
}
