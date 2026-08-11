import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TaskReport } from '@/types/api'

// The backend buckets UTC timestamps (created_at/completed_at) into the client's
// calendar days using this timezone, mirroring the heatmap.
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

export function useTaskReport(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'tasks', from, to],
    queryFn: async () =>
      (await api.get('/reports/tasks', { params: { from, to, tz } })).data.data as TaskReport,
  })
}
