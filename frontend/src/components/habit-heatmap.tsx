import { useTranslation } from 'react-i18next'
import type { HabitHeatmap as HabitHeatmapData } from '@/types/api'
import { Heatmap, type HeatmapCopy } from '@/components/heatmap'

export function HabitHeatmap({ data }: { data: HabitHeatmapData }) {
  const { t } = useTranslation('habits')
  const copy: HeatmapCopy = {
    period: (total) => t('heatmap.period', { count: total }),
    cell: (n, day) => t('heatmap.cell', { count: n, day }),
    empty: (day) => t('heatmap.empty', { day }),
  }
  return <Heatmap data={data} copy={copy} />
}
