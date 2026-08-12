export type DueTone = 'overdue' | 'soon' | 'near' | 'week' | 'far'

export interface DueDateMeta {
  label: string
  tone: DueTone
}

// Determinístico, baseado em data LOCAL (não UTC): due vem como 'Y-m-d' puro, sem hora.
export function dueDateMeta(due: string | null): DueDateMeta | null {
  if (!due) return null
  const [y, m, d] = due.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { label: `atrasada ${-days}d`, tone: 'overdue' }
  if (days === 0) return { label: 'hoje', tone: 'soon' }
  if (days === 1) return { label: 'amanhã', tone: 'soon' }
  if (days <= 3) return { label: `em ${days}d`, tone: 'near' }
  if (days <= 7) return { label: `em ${days}d`, tone: 'week' }
  return { label: `${d}/${m}`, tone: 'far' }
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
