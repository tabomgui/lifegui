import type { HabitHeatmap as HabitHeatmapData } from '@/types/api'
import { Heatmap, type HeatmapCopy } from '@/components/heatmap'

const HABIT_COPY: HeatmapCopy = {
  period: (total) => `${total} hábitos concluídos no período`,
  cell: (n, day) => `${n} hábito(s) concluído(s) em ${day}`,
  empty: (day) => `Nenhum hábito em ${day}`,
}

export function HabitHeatmap({ data }: { data: HabitHeatmapData }) {
  return <Heatmap data={data} copy={HABIT_COPY} />
}
