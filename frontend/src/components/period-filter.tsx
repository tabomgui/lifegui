import { useTranslation } from 'react-i18next'

// Filtro de período compartilhado entre os cards de Relatórios (heatmap de
// tarefas e radar de hábitos), pra manterem visual e comportamento idênticos.

export const PERIODS = [
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
  { key: '365d', days: 365 },
] as const

export type PeriodKey = (typeof PERIODS)[number]['key']

// Formata uma data como 'Y-m-d' LOCAL (evita `toISOString`, que é UTC e pode
// cair no dia errado).
function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Janela inclusiva de `days` dias terminando hoje (datas locais).
export function rangeForDays(days: number): { from: string; to: string } {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1))
  return { from: formatLocalDate(start), to: formatLocalDate(today) }
}

export function PeriodFilter({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex gap-1">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === p.key ? 'bg-secondary text-secondary-foreground' : 'hover:bg-accent'
          }`}
        >
          {t(`period.${p.key}`)}
        </button>
      ))}
    </div>
  )
}
