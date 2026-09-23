import type { TaskHeatmap as TaskHeatmapData } from '@/types/api'
import { Heatmap, type HeatmapCopy } from '@/components/heatmap'

const TASK_COPY: HeatmapCopy = {
  period: (total) => `${total} tarefas concluídas no período`,
  cell: (n, day) => `${n} tarefa(s) concluída(s) em ${day}`,
  empty: (day) => `Nenhuma tarefa em ${day}`,
}

export function TaskHeatmap({ data }: { data: TaskHeatmapData }) {
  return <Heatmap data={data} copy={TASK_COPY} />
}
