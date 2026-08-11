import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TaskHeatmap } from '@/types/api'

// The backend stores completed_at in UTC but buckets the heatmap by this
// timezone, so a task completed at night lands in the right calendar cell
// for the user instead of shifting to the next UTC day.
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

export function useTaskHeatmap(from: string, to: string) {
  return useQuery({
    queryKey: ['tasks', 'heatmap', from, to],
    queryFn: async () => (await api.get('/tasks/heatmap', { params: { from, to, tz } })).data.data as TaskHeatmap,
  })
}
