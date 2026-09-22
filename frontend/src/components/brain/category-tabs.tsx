import { useState } from 'react'
import type { DragEvent } from 'react'
import { Inbox, Pencil, Plus, Search, Trash2, Waypoints } from 'lucide-react'
import { DynamicIcon } from '@/components/icon'
import { BrainCategoryDialog } from '@/components/brain/category-dialog'
import { useDeleteBrainCategory, useReorderBrainCategories } from '@/hooks/use-brain'
import type { BrainCategory } from '@/types/api'
import { toast } from 'sonner'

export const INBOX_TAB = '__inbox__'

// Tipo custom no dataTransfer pra reordenação de abas (espelha o de tarefas).
const CAT_DND = 'application/x-lifegui-brain-category'

export function BrainCategoryTabs({
  categories, active, inboxCount, onChange, search, onSearchChange, graphMode, onToggleGraph,
}: {
  categories: BrainCategory[]
  active: string
  inboxCount: number
  onChange: (tab: string) => void
  search: string
  onSearchChange: (value: string) => void
  graphMode: boolean
  onToggleGraph: () => void
}) {
  const del = useDeleteBrainCategory()
  const reorder = useReorderBrainCategories()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BrainCategory | null>(null)
  const [dragName, setDragName] = useState<string | null>(null)
  const [dropInto, setDropInto] = useState<{ name: string; side: 'left' | 'right' } | null>(null)

  function openNew() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: BrainCategory) { setEditing(c); setDialogOpen(true) }

  async function remove(c: BrainCategory) {
    if (!confirm(`Apagar a categoria "${c.name}"? Só é possível se estiver vazia.`)) return
    try {
      await del.mutateAsync(c.name)
      if (active === c.name) onChange(categories.find((x) => x.name !== c.name)?.name ?? INBOX_TAB)
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status
      toast.error(status === 409 ? 'A categoria tem notas; esvazie antes de apagar' : 'Não foi possível apagar')
    }
  }

  function sideFor(e: DragEvent<HTMLDivElement>): 'left' | 'right' {
    const r = e.currentTarget.getBoundingClientRect()
    return e.clientX < r.left + r.width / 2 ? 'left' : 'right'
  }

  function onDrop(target: BrainCategory, e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes(CAT_DND)) return
    e.preventDefault()
    const side = sideFor(e)
    setDropInto(null)
    const dragged = dragName
    setDragName(null)
    if (dragged == null || dragged === target.name) return

    const names = categories.map((c) => c.name)
    const from = names.indexOf(dragged)
    if (from === -1) return
    names.splice(from, 1)
    let insert = names.indexOf(target.name)
    if (insert === -1) return
    if (side === 'right') insert += 1
    names.splice(insert, 0, dragged)
    if (names.every((n, i) => n === categories[i]?.name)) return
    reorder.mutate(names)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 md:px-6">
      <div role="tablist" className="flex flex-wrap items-center gap-1">
        <button
          role="tab"
          aria-selected={active === INBOX_TAB}
          onClick={() => onChange(INBOX_TAB)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
            active === INBOX_TAB ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          Inbox
          <span className={`ml-0.5 rounded-full px-1.5 text-[11px] ${inboxCount > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-secondary'}`}>
            {inboxCount}
          </span>
        </button>
        {categories.map((c) => (
          <div
            key={c.name}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(CAT_DND, c.name)
              e.dataTransfer.effectAllowed = 'move'
              setDragName(c.name)
            }}
            onDragEnd={() => { setDragName(null); setDropInto(null) }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(CAT_DND)) {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDropInto({ name: c.name, side: sideFor(e) })
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropInto(null)
            }}
            onDrop={(e) => onDrop(c, e)}
            className={`group relative inline-flex shrink-0 cursor-grab items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium active:cursor-grabbing ${
              active === c.name ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'
            } ${dragName === c.name ? 'opacity-40' : ''}`}
          >
            {dropInto?.name === c.name && (
              <span className={`pointer-events-none absolute inset-y-1 w-0.5 rounded-full bg-primary ${dropInto.side === 'left' ? '-left-1' : '-right-1'}`} />
            )}
            <button role="tab" aria-selected={active === c.name} onClick={() => onChange(c.name)} className="inline-flex items-center gap-1.5">
              <DynamicIcon name={c.icon} className="h-3.5 w-3.5" style={{ color: c.color }} />
              {c.name}
              <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-[11px]">{c.total}</span>
            </button>
            <button onClick={() => openEdit(c)} aria-label={`Editar ${c.name}`} title={`Editar ${c.name}`}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={() => remove(c)} aria-label={`Apagar ${c.name}`} title={`Apagar ${c.name}`}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button onClick={openNew} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent">
          <Plus className="h-3.5 w-3.5" /> Categoria
        </button>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {active !== INBOX_TAB && !graphMode && (
          <div className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Buscar notas"
              placeholder="Buscar notas…"
              className="w-28 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:w-40"
            />
          </div>
        )}
        <button
          onClick={onToggleGraph}
          aria-pressed={graphMode}
          title={graphMode ? 'Voltar pras notas' : 'Visão de grafo'}
          className={`inline-flex items-center rounded-md border px-2 py-1.5 ${
            graphMode ? 'bg-secondary text-foreground' : 'bg-card text-muted-foreground hover:bg-accent'
          }`}
        >
          <Waypoints className="h-3.5 w-3.5" />
        </button>
      </div>
      <BrainCategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />
    </div>
  )
}
