import { useState } from 'react'
import type { HabitStat } from '@/types/api'

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

export function HabitRadarChart({ habits }: { habits: HabitStat[] }) {
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

  const ariaLabel = `Radar de aderência: ${habits.map((h) => `${h.name} ${h.rate}%`).join(', ')}`

  return (
    <div className="flex justify-center">
      <div className="relative aspect-square w-full max-w-[420px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full"
          role="img"
          aria-label={ariaLabel}
        >
          {/* grid rings */}
          {RINGS.map((ring) => {
            const points = axes
              .map((a) => {
                const p = pointAt(a.angle, (ring / 100) * RADIUS)
                return `${p.x},${p.y}`
              })
              .join(' ')
            return <polygon key={ring} points={points} className="fill-none stroke-border" strokeWidth={1} />
          })}

          {/* radial value labels along the top axis (straight up) */}
          {RINGS.map((ring) => (
            <text
              key={ring}
              x={CENTER + 4}
              y={CENTER - (ring / 100) * RADIUS}
              className="fill-muted-foreground text-[8px]"
            >
              {ring}
            </text>
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
            {axes[hovered].habit.name} — {axes[hovered].habit.rate}% ({axes[hovered].habit.done_count}/
            {axes[hovered].habit.expected})
          </div>
        )}
      </div>
    </div>
  )
}

function HabitBarList({ habits }: { habits: HabitStat[] }) {
  if (habits.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Nenhum hábito para exibir.</p>
  }

  return (
    <div className="space-y-3">
      {habits.map((habit) => (
        <div key={habit.habit_id} className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: habit.color }} />
          <span className="w-28 shrink-0 truncate text-sm">{habit.name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-blue-500 dark:bg-blue-400"
              style={{ width: `${habit.rate}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{habit.rate}%</span>
        </div>
      ))}
    </div>
  )
}

export function HabitRadar({ habits }: { habits: HabitStat[] }) {
  if (habits.length < 3) {
    return <HabitBarList habits={habits} />
  }
  return <HabitRadarChart habits={habits} />
}
