import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TaskHeatmap } from '@/types/api'

export function useTaskHeatmap() {
  return useQuery({
    queryKey: ['tasks', 'heatmap'],
    queryFn: async () => (await api.get('/tasks/heatmap')).data.data as TaskHeatmap,
  })
}
