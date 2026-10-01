import { Check, Plus } from 'lucide-react'
import { DynamicIcon } from '@/components/icon'
import { cn } from '@/lib/utils'

export function SuggestionChip({
  label,
  icon,
  color,
  added,
  disabled,
  onAdd,
}: {
  label: string
  icon: string
  color: string
  added: boolean
  disabled?: boolean
  onAdd: () => void
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={added || disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
        added ? 'border-primary/40 bg-primary/10' : 'hover:bg-accent disabled:opacity-50',
      )}
    >
      <DynamicIcon name={icon} className="h-4 w-4" style={{ color }} />
      {label}
      {added ? <Check className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  )
}
