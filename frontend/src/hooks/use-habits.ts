import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import type { Habit, HabitDay, HabitSummary } from '@/types/api'

const HABITS = ['habits']
const summaryKey = (week: string) => ['habits', 'summary', week]

export function useHabits(archived = false, enabled = true) {
  return useQuery({
    queryKey: ['habits', 'list', archived],
    queryFn: async () =>
      (await api.get('/habits', { params: archived ? { archived: 1 } : {} })).data.data as Habit[],
    enabled,
  })
}

export function useHabitSummary(week: string) {
  return useQuery({
    queryKey: summaryKey(week),
    queryFn: async () => (await api.get(`/habits/summary?week=${week}`)).data.data as HabitSummary[],
  })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<Habit, 'name' | 'icon' | 'color' | 'target_per_week'>) => {
      await csrf()
      return (await api.post('/habits', input)).data.data as Habit
    },
    // Invalidar ['habits'] também revalida ['habits','summary',week] por prefix-matching do
    // TanStack Query (dependência intencional; se a forma da key mudar, ajustar aqui).
    onSuccess: () => qc.invalidateQueries({ queryKey: HABITS }),
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'target_per_week'>> & { id: number }) => {
      await csrf()
      return (await api.patch(`/habits/${id}`, input)).data.data as Habit
    },
    // Invalidar ['habits'] também revalida ['habits','summary',week] por prefix-matching do
    // TanStack Query (dependência intencional; se a forma da key mudar, ajustar aqui).
    onSuccess: () => qc.invalidateQueries({ queryKey: HABITS }),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await csrf()
      await api.delete(`/habits/${id}`)
    },
    // Invalidar ['habits'] também revalida ['habits','summary',week] por prefix-matching do
    // TanStack Query (dependência intencional; se a forma da key mudar, ajustar aqui).
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

// Estado-alvo do dia. Sem `state` = compat: alterna `done` e zera `skipped`.
export type HabitToggleState = 'done' | 'skip' | 'none'

function applyState(d: HabitDay, state?: HabitToggleState): HabitDay {
  if (state === 'done') return { ...d, done: true, skipped: false }
  if (state === 'skip') return { ...d, done: false, skipped: true }
  if (state === 'none') return { ...d, done: false, skipped: false }
  return { ...d, done: !d.done, skipped: false }
}

// Toggle otimista: aplica o estado-alvo ao dia no summary da semana antes da resposta.
// Snapshot/rollback é por-mutação: sob toggles concorrentes muito rápidos, um rollback
// pode sobrescrever o patch otimista de outro toggle em curso. O onSettled (invalidate)
// sempre reconcilia com o servidor logo em seguida, então a janela de inconsistência é curta.
export function useToggleHabit(week: string) {
  const qc = useQueryClient()
  const key = summaryKey(week)
  return useMutation({
    mutationFn: async ({ habitId, date, state }: { habitId: number; date: string; state?: HabitToggleState }) => {
      await csrf()
      const body: { date: string; state?: HabitToggleState } = { date }
      if (state) body.state = state
      return (await api.post(`/habits/${habitId}/toggle`, body)).data.data as {
        date: string
        done: boolean
        skipped: boolean
      }
    },
    onMutate: async ({ habitId, date, state }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<HabitSummary[]>(key)
      qc.setQueryData<HabitSummary[]>(key, (old) =>
        (old ?? []).map((h) => {
          if (h.habit_id !== habitId) return h
          const days = h.days.map((d) => (d.date === date ? applyState(d, state) : d))
          return { ...h, days, done_count: days.filter((d) => d.done).length }
        }),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useArchiveHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await csrf()
      return (await api.post(`/habits/${id}/archive`)).data.data as Habit
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useUnarchiveHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await csrf()
      return (await api.post(`/habits/${id}/unarchive`)).data.data as Habit
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}
