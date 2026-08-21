import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { HabitHeatmap, TaskHeatmap } from '@/types/api'

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

// habit_logs.date já é data-calendário local, então o heatmap de hábitos não
// precisa de timezone (diferente do de tarefas, que bucketiza completed_at UTC).
export function useHabitHeatmap(from: string, to: string) {
  return useQuery({
    queryKey: ['habits', 'heatmap', from, to],
    queryFn: async () => (await api.get('/habits/heatmap', { params: { from, to } })).data.data as HabitHeatmap,
  })
}
