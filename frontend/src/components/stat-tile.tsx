import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: ReactNode
  // Signed magnitude of the change vs the previous period. The chip is hidden
  // when null/undefined. Sign picks the arrow; `deltaGood` picks the color.
  delta?: number | null
  deltaLabel?: string
  // Which direction is "good news" for this metric. up => higher is better
  // (e.g. concluídas); down => lower is better (e.g. atrasadas). When omitted a
  // rising delta is treated as good.
  deltaGood?: 'up' | 'down'
  caption?: string
  icon?: LucideIcon
  // Optional tiny inline sparkline (recent values, oldest -> newest).
  sparkline?: number[]
}

// A small SVG sparkline pinned to the bottom of the tile. Single accent hue.
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 280
  const h = 40
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - 3 - ((v - min) / range) * (h - 6),
  ])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `M ${pts[0][0].toFixed(1)} ${h} ${pts
    .map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ')} L ${w} ${h} Z`
  const last = pts[pts.length - 1]
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full opacity-60"
      aria-hidden
    >
      <path d={area} fill="#3b82f6" opacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r={2.5} fill="#3b82f6" />
    </svg>
  )
}

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  deltaGood = 'up',
  caption,
  icon: Icon,
  sparkline,
}: StatTileProps) {
  const hasDelta = delta !== null && delta !== undefined
  const dir: 'up' | 'down' | null = !hasDelta ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : null
  const good = dir === null ? null : dir === deltaGood
  const deltaText = hasDelta ? `${delta > 0 ? '+' : ''}${delta}${deltaLabel ? ` ${deltaLabel}` : ''}` : ''

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums text-foreground">{value}</span>
        {hasDelta && (
          <span
            className={cn(
              'mb-1.5 inline-flex items-center gap-0.5 text-xs font-medium',
              good === null ? 'text-muted-foreground' : good ? 'text-emerald-500' : 'text-red-500',
            )}
          >
            {dir === 'up' ? (
              <ArrowUp className="h-3 w-3" />
            ) : dir === 'down' ? (
              <ArrowDown className="h-3 w-3" />
            ) : null}
            {deltaText}
          </span>
        )}
      </div>
      {caption ? <p className="mt-1 text-xs text-muted-foreground">{caption}</p> : null}
      {sparkline && sparkline.length > 1 ? <Sparkline values={sparkline} /> : null}
    </div>
  )
}
