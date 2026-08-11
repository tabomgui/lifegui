import { useState } from 'react'
import type { DragEvent } from 'react'
import { Plus, Pencil, Trash2, Layers } from 'lucide-react'
import { useCategories, useDeleteCategory } from '@/hooks/use-categories'
import { useTasks, useUpdateTaskCategory } from '@/hooks/use-tasks'
import { CategoryDialog } from '@/components/category-dialog'
import { DynamicIcon } from '@/components/icon'
import type { Category } from '@/types/api'
import { toast } from 'sonner'

export function CategoryTabs({
  active, onChange,
}: { active: number | 'all'; onChange: (id: number | 'all') => void }) {
  const { data: categories = [] } = useCategories()
  const { data: tasks = [] } = useTasks()
  const del = useDeleteCategory()
  const assignCategory = useUpdateTaskCategory()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const countFor = (id: number | 'all') =>
    id === 'all' ? tasks.length : tasks.filter((t) => t.category_id === id).length

  function openNew() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: Category) { setEditing(c); setDialogOpen(true) }
  async function remove(c: Category) {
    if (!confirm(`Apagar "${c.name}"? As tarefas ficam sem categoria.`)) return
    try { await del.mutateAsync(c.id); if (active === c.id) onChange('all') }
    catch { toast.error('Não foi possível apagar') }
  }

  // Arrastar um card de tarefa (dataTransfer com o id, setado no task-card) e soltar
  // numa aba categoriza a tarefa naquela categoria.
  function onDropCategory(c: Category, e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOverId(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.category_id === c.id) return
    assignCategory.mutate({ id, category_id: c.id })
    toast.success(`Movida para ${c.name}`)
  }

  return (
    <div role="tablist" className="flex items-center gap-1 overflow-x-auto border-b px-4 py-2 md:px-6">
      <button role="tab" aria-selected={active === 'all'} onClick={() => onChange('all')}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active === 'all' ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'}`}>
        <Layers className="h-3.5 w-3.5" /> Todas
        <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-[11px]">{countFor('all')}</span>
      </button>
      {categories.map((c) => (
        <div key={c.id}
          onDragOver={(e) => { e.preventDefault(); setDragOverId(c.id) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null) }}
          onDrop={(e) => onDropCategory(c, e)}
          className={`group inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium ${active === c.id ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'} ${dragOverId === c.id ? 'bg-accent outline-2 outline-dashed outline-ring -outline-offset-2' : ''}`}>
          <button role="tab" aria-selected={active === c.id} onClick={() => onChange(c.id)} className="inline-flex items-center gap-1.5">
            <DynamicIcon name={c.icon} className="h-3.5 w-3.5" style={{ color: c.color }} />
            {c.name}
            <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-[11px]">{countFor(c.id)}</span>
          </button>
          <button onClick={() => openEdit(c)} aria-label={`Editar ${c.name}`} title={`Editar ${c.name}`} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100"><Pencil className="h-3 w-3" /></button>
          <button onClick={() => remove(c)} aria-label={`Apagar ${c.name}`} title={`Apagar ${c.name}`} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <button onClick={openNew} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent">
        <Plus className="h-3.5 w-3.5" /> Categoria
      </button>
      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />
    </div>
  )
}
