import type { NoteStatus } from '@/types/api'

export const NOTE_STATUSES: NoteStatus[] = ['novo', 'estudando', 'concluido', 'a-revisar']

// Chave de tradução (namespace brain) por status; o rótulo vem de t(STATUS_LABEL_KEY[status]).
// `as const satisfies` preserva o tipo literal de cada valor (exigido pelo `t` tipado).
export const STATUS_LABEL_KEY = {
  novo: 'status.novo',
  estudando: 'status.estudando',
  concluido: 'status.concluido',
  'a-revisar': 'status.a-revisar',
} as const satisfies Record<NoteStatus, string>

// Classes de badge por status (par claro/escuro seguindo a paleta neutral do app).
export const STATUS_BADGE: Record<NoteStatus, string> = {
  novo: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  estudando: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  concluido: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'a-revisar': 'bg-red-500/15 text-red-700 dark:text-red-400',
}

// Bolinha de status pros filtros compactos.
export const STATUS_DOT: Record<NoteStatus, string> = {
  novo: 'bg-blue-500',
  estudando: 'bg-amber-500',
  concluido: 'bg-emerald-500',
  'a-revisar': 'bg-red-500',
}
