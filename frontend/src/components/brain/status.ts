import type { NoteStatus } from '@/types/api'

export const NOTE_STATUSES: NoteStatus[] = ['novo', 'estudando', 'concluido', 'a-revisar']

export const STATUS_LABEL: Record<NoteStatus, string> = {
  novo: 'Novo',
  estudando: 'Estudando',
  concluido: 'Concluído',
  'a-revisar': 'A revisar',
}

// Classes de badge por status (par claro/escuro seguindo a paleta neutral do app).
export const STATUS_BADGE: Record<NoteStatus, string> = {
  novo: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  estudando: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  concluido: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'a-revisar': 'bg-red-500/15 text-red-700 dark:text-red-400',
}
