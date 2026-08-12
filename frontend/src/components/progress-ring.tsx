// Anel de progresso semanal (feitos/meta). Sem meta: mostra só o número, sem arco.
export function ProgressRing({
  value,
  max,
  color = '#10b981',
  showText = true,
  className = 'h-8 w-8',
}: {
  value: number
  max?: number | null
  color?: string
  showText?: boolean
  className?: string
}) {
  const r = 15
  const circ = 2 * Math.PI * r
  const hasTarget = !!max && max > 0
  const pct = hasTarget ? Math.min(value / (max as number), 1) : 0
  const offset = circ * (1 - pct)
  const label = hasTarget ? `${value}/${max}` : `${value}`
  return (
    <svg viewBox="0 0 36 36" className={`shrink-0 ${className}`} aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      {hasTarget && (
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 18 18)"
        />
      )}
      {showText && (
        <text x="18" y="21" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">
          {label}
        </text>
      )}
    </svg>
  )
}
