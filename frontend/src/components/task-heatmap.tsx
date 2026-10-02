import { useTranslation } from 'react-i18next'
import type { TaskHeatmap as TaskHeatmapData } from '@/types/api'
import { Heatmap, type HeatmapCopy } from '@/components/heatmap'

export function TaskHeatmap({ data }: { data: TaskHeatmapData }) {
  const { t } = useTranslation('tasks')
  const copy: HeatmapCopy = {
    period: (total) => t('heatmap.period', { count: total }),
    cell: (n, day) => t('heatmap.cell', { count: n, day }),
    empty: (day) => t('heatmap.empty', { day }),
  }
  return <Heatmap data={data} copy={copy} />
}
