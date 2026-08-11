import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import type { Habit, HabitSummary } from '@/types/api'

const HABITS = ['habits']
const summaryKey = (week: string) => ['habits', 'summary', week]

export function useHabits() {
  return useQuery({
    queryKey: HABITS,
    queryFn: async () => (await api.get('/habits')).data.data as Habit[],
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
    mutationFn: async (input: Pick<Habit, 'name' | 'emoji' | 'color'> & { target_per_week: number | null }) => {
      await csrf()
      return (await api.post('/habits', input)).data.data as Habit
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: HABITS }),
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Pick<Habit, 'name' | 'emoji' | 'color' | 'target_per_week'>> & { id: number }) => {
      await csrf()
      return (await api.patch(`/habits/${id}`, input)).data.data as Habit
    },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

// Toggle otimista: inverte o dia no summary da semana antes da resposta.
export function useToggleHabit(week: string) {
  const qc = useQueryClient()
  const key = summaryKey(week)
  return useMutation({
    mutationFn: async ({ habitId, date }: { habitId: number; date: string }) => {
      await csrf()
      return (await api.post(`/habits/${habitId}/toggle`, { date })).data.data as { date: string; done: boolean }
    },
    onMutate: async ({ habitId, date }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<HabitSummary[]>(key)
      qc.setQueryData<HabitSummary[]>(key, (old) =>
        (old ?? []).map((h) =>
          h.habit_id !== habitId
            ? h
            : {
                ...h,
                days: h.days.map((d) => (d.date === date ? { ...d, done: !d.done } : d)),
                done_count: h.days.reduce((n, d) => n + (d.date === date ? (d.done ? 0 : 1) : d.done ? 1 : 0), 0),
              },
        ),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}
