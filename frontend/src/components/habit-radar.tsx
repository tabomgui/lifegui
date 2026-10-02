import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { HabitStat } from '@/types/api'
import { useFormat } from '@/i18n/format'

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 120
const RINGS = [25, 50, 75, 100]

function truncate(name: string, max = 14): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

function pointAt(angle: number, r: number): { x: number; y: number } {
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) }
}

function angleFor(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n
}

// Denominador claro no tooltip: hábito diário conta dias do período;
// hábito com meta semanal mostra a meta em vez de um esperado fracionário.
function detailFor(h: HabitStat, t: TFunction<'habits'>): string {
  if (h.target_per_week == null) {
    const days = Math.round(h.expected)
    return t('radar.daysDetail', { done: h.done_count, days })
  }
  return t('radar.targetDetail', { count: h.done_count, target: h.target_per_week })
}

export function HabitRadarChart({ habits }: { habits: HabitStat[] }) {
  const { t } = useTranslation('habits')
  const { list } = useFormat()
  const [hovered, setHovered] = useState<number | null>(null)
  const n = habits.length

  const axes = habits.map((habit, i) => {
    const angle = angleFor(i, n)
    const outer = pointAt(angle, RADIUS)
    const labelPos = pointAt(angle, RADIUS * 1.15)
    const value = pointAt(angle, (habit.rate / 100) * RADIUS)
    return { habit, angle, outer, labelPos, value }
  })

  const dataPolygon = axes.map((a) => `${a.value.x},${a.value.y}`).join(' ')

  const ariaLabel = t('radar.ariaLabel', { list: list(habits.map((h) => `${h.name} ${h.rate}%`)) })

  return (
    <div className="flex justify-center">
      <div className="relative aspect-square w-full max-w-[420px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full"
          role="img"
          aria-label={ariaLabel}
        >
          {/* grid rings — círculos concêntricos (não degeneram com poucos eixos) */}
          {RINGS.map((ring) => (
            <circle
              key={ring}
              cx={CENTER}
              cy={CENTER}
              r={(ring / 100) * RADIUS}
              className="fill-none stroke-border"
              strokeWidth={1}
            />
          ))}

          {/* axis lines */}
          {axes.map((a, i) => (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={a.outer.x}
              y2={a.outer.y}
              className="stroke-border"
              strokeWidth={1}
            />
          ))}

          {/* data polygon */}
          <polygon
            points={dataPolygon}
            className="fill-blue-500/15 stroke-blue-600 dark:fill-blue-400/15 dark:stroke-blue-400"
            strokeWidth={2}
          />

          {/* vertices */}
          {axes.map((a, i) => (
            <g key={i}>
              <circle
                cx={a.value.x}
                cy={a.value.y}
                r={9}
                className="fill-transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((prev) => (prev === i ? null : prev))}
              />
              <circle
                cx={a.value.x}
                cy={a.value.y}
                r={4}
                className="fill-blue-600 dark:fill-blue-400"
                pointerEvents="none"
              />
            </g>
          ))}

          {/* axis labels */}
          {axes.map((a, i) => {
            const dx = a.labelPos.x - CENTER
            const anchor = Math.abs(dx) < 12 ? 'middle' : dx > 0 ? 'start' : 'end'
            const dotOffset = anchor === 'start' ? -6 : anchor === 'end' ? 6 : 0
            return (
              <g key={i}>
                <circle cx={a.labelPos.x + dotOffset} cy={a.labelPos.y} r={3} fill={a.habit.color} />
                <text
                  x={a.labelPos.x}
                  y={a.labelPos.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {truncate(a.habit.name)}
                </text>
              </g>
            )
          })}
        </svg>

        {hovered !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border bg-popover px-2 py-1 text-xs text-popover-foreground shadow"
            style={{
              left: `${(axes[hovered].value.x / SIZE) * 100}%`,
              top: `${(axes[hovered].value.y / SIZE) * 100}%`,
            }}
          >
            {axes[hovered].habit.name} — {axes[hovered].habit.rate}% · {detailFor(axes[hovered].habit, t)}
          </div>
        )}
      </div>
    </div>
  )
}

export function HabitRadar({ habits }: { habits: HabitStat[] }) {
  const { t } = useTranslation('habits')
  if (habits.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">{t('radar.empty')}</p>
  }
  return <HabitRadarChart habits={habits} />
}
