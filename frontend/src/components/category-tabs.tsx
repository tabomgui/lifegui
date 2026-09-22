import { useState } from 'react'
import type { DragEvent } from 'react'
import { Plus, Pencil, Trash2, Layers, Sun, Search } from 'lucide-react'
import { useCategories, useDeleteCategory, useReorderCategories } from '@/hooks/use-categories'
import { useTasks, useUpdateTaskCategory } from '@/hooks/use-tasks'
import { CategoryDialog } from '@/components/category-dialog'
import { DynamicIcon } from '@/components/icon'
import { isOverdueOrToday } from '@/lib/due-date'
import type { Category } from '@/types/api'
import { toast } from 'sonner'

export type TaskTab = number | 'all' | 'today'

// Tipo custom no dataTransfer pra diferenciar "arrastar aba pra reordenar" de
// "arrastar card de tarefa pra categorizar" (que usa text/plain).
const CAT_DND = 'application/x-lifegui-category'

export function CategoryTabs({
  active, onChange, search, onSearchChange,
}: {
  active: TaskTab
  onChange: (id: TaskTab) => void
  search: string
  onSearchChange: (value: string) => void
}) {
  const { data: categories = [] } = useCategories()
  const { data: tasks = [] } = useTasks()
  const del = useDeleteCategory()
  const reorder = useReorderCategories()
  const assignCategory = useUpdateTaskCategory()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  // Reordenação de abas: qual aba está sendo arrastada e onde cairia (id + lado).
  const [dragCatId, setDragCatId] = useState<number | null>(null)
  const [dropInto, setDropInto] = useState<{ id: number; side: 'left' | 'right' } | null>(null)

  const countFor = (id: number | 'all') =>
    id === 'all' ? tasks.length : tasks.filter((t) => t.category_id === id).length
  const todayCount = tasks.filter((t) => t.status !== 'done' && isOverdueOrToday(t.due_date)).length

  function openNew() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: Category) { setEditing(c); setDialogOpen(true) }
  async function remove(c: Category) {
    if (!confirm(`Apagar "${c.name}"? As tarefas ficam sem categoria.`)) return
    try { await del.mutateAsync(c.id); if (active === c.id) onChange('all') }
    catch { toast.error('Não foi possível apagar') }
  }

  // Arrastar um card de tarefa (dataTransfer com o id, setado no task-card) e soltar
  // numa aba categoriza a tarefa naquela categoria.
  async function onDropCategory(c: Category, e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOverId(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.category_id === c.id) return
    try {
      await assignCategory.mutateAsync({ id, category_id: c.id })
      toast.success(`Movida para ${c.name}`)
    } catch {
      toast.error('Não foi possível mover a tarefa')
    }
  }

  // Lado do drop conforme o ponteiro cai na metade esquerda/direita da aba alvo.
  function sideFor(e: DragEvent<HTMLDivElement>): 'left' | 'right' {
    const r = e.currentTarget.getBoundingClientRect()
    return e.clientX < r.left + r.width / 2 ? 'left' : 'right'
  }

  function onCatDragOver(c: Category, e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes(CAT_DND)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDropInto({ id: c.id, side: sideFor(e) })
      setDragOverId(null)
    } else if (e.dataTransfer.types.includes('text/plain')) {
      e.preventDefault()
      setDragOverId(c.id)
      setDropInto(null)
    }
  }

  function onCatDrop(c: Category, e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes(CAT_DND)) {
      e.preventDefault()
      reorderCategory(c.id, sideFor(e))
      setDropInto(null)
      setDragCatId(null)
      return
    }
    onDropCategory(c, e)
  }

  function reorderCategory(targetId: number, side: 'left' | 'right') {
    if (dragCatId == null || dragCatId === targetId) return
    const orig = categories.map((x) => x.id)
    const ids = [...orig]
    const from = ids.indexOf(dragCatId)
    if (from === -1) return
    ids.splice(from, 1)
    let insert = ids.indexOf(targetId)
    if (insert === -1) return
    if (side === 'right') insert += 1
    ids.splice(insert, 0, dragCatId)
    if (ids.every((id, i) => id === orig[i])) return // ordem não mudou
    reorder.mutate(ids)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 md:px-6">
      <div role="tablist" className="flex flex-wrap items-center gap-1">
      <button role="tab" aria-selected={active === 'today'} onClick={() => onChange('today')}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active === 'today' ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'}`}>
        <Sun className="h-3.5 w-3.5 text-amber-400" /> Hoje
        <span className={`ml-0.5 rounded-full px-1.5 text-[11px] ${todayCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-secondary'}`}>{todayCount}</span>
      </button>
      <button role="tab" aria-selected={active === 'all'} onClick={() => onChange('all')}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active === 'all' ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'}`}>
        <Layers className="h-3.5 w-3.5" /> Todas
        <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-[11px]">{countFor('all')}</span>
      </button>
      {categories.map((c) => (
        <div key={c.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(CAT_DND, String(c.id))
            e.dataTransfer.effectAllowed = 'move'
            setDragCatId(c.id)
          }}
          onDragEnd={() => { setDragCatId(null); setDropInto(null); setDragOverId(null) }}
          onDragOver={(e) => onCatDragOver(c, e)}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setDragOverId(null); setDropInto(null) } }}
          onDrop={(e) => onCatDrop(c, e)}
          className={`group relative inline-flex shrink-0 cursor-grab items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium active:cursor-grabbing ${active === c.id ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'} ${dragOverId === c.id ? 'bg-accent outline-2 outline-dashed outline-ring -outline-offset-2' : ''} ${dragCatId === c.id ? 'opacity-40' : ''}`}>
          {dropInto?.id === c.id && (
            <span className={`pointer-events-none absolute inset-y-1 w-0.5 rounded-full bg-primary ${dropInto.side === 'left' ? '-left-1' : '-right-1'}`} />
          )}
          <button role="tab" aria-selected={active === c.id} onClick={() => onChange(c.id)} className="inline-flex items-center gap-1.5">
            <DynamicIcon name={c.icon} className="h-3.5 w-3.5" style={{ color: c.color }} />
            {c.name}
            <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-[11px]">{countFor(c.id)}</span>
          </button>
          <button onClick={() => openEdit(c)} aria-label={`Editar ${c.name}`} title={`Editar ${c.name}`} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100"><Pencil className="h-3 w-3" /></button>
          <button onClick={() => remove(c)} aria-label={`Apagar ${c.name}`} title={`Apagar ${c.name}`} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <button onClick={openNew} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent">
        <Plus className="h-3.5 w-3.5" /> Categoria
      </button>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2 py-1">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar tarefas"
          placeholder="Buscar tarefas…"
          className="w-28 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:w-40" />
      </div>
      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />
    </div>
  )
}
