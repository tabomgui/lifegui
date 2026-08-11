import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { HabitStats } from '@/types/api'

export function useHabitStats(from: string, to: string) {
  return useQuery({
    queryKey: ['habits', 'stats', from, to],
    queryFn: async () => (await api.get('/habits/stats', { params: { from, to } })).data.data as HabitStats,
  })
}
