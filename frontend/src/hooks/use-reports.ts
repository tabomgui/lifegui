import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { HabitReport, TaskReport } from '@/types/api'

// The backend buckets UTC timestamps (created_at/completed_at) into the client's
// calendar days using this timezone, mirroring the heatmap.
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

export function useTaskReport(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'tasks', from, to],
    enabled,
    queryFn: async () =>
      (await api.get('/reports/tasks', { params: { from, to, tz } })).data.data as TaskReport,
  })
}

export function useHabitReport(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'habits', from, to],
    enabled,
    queryFn: async () =>
      (await api.get('/reports/habits', { params: { from, to, tz } })).data.data as HabitReport,
  })
}
