import { useState } from 'react'
import type { DragEvent } from 'react'
import { ChevronDown, Plus, Pencil, Trash2, Layers, Sun, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const { t } = useTranslation('tasks')
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
    if (!confirm(t('tabs.deleteConfirm', { name: c.name }))) return
    try { await del.mutateAsync(c.id); if (active === c.id) onChange('all') }
    catch { toast.error(t('toast.deleteError')) }
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
      toast.success(t('tabs.movedToCategory', { name: c.name }))
    } catch {
      toast.error(t('tabs.moveCategoryError'))
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

  const current = typeof active === 'number' ? categories.find((c) => c.id === active) ?? null : null

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2 md:px-6">
      {/* Mobile: seletor compacto (1 linha sempre); desktop: abas. */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex max-w-[60vw] items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium">
              {current ? (
                <>
                  <DynamicIcon name={current.icon} className="h-3.5 w-3.5 shrink-0" style={{ color: current.color }} />
                  <span className="truncate">{current.name}</span>
                  <span className="rounded-full bg-secondary px-1.5 text-[11px]">{countFor(current.id)}</span>
                </>
              ) : active === 'today' ? (
                <>
                  <Sun className="h-3.5 w-3.5 shrink-0 text-amber-400" /> {t('tabs.today')}
                  <span className={`rounded-full px-1.5 text-[11px] ${todayCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-secondary'}`}>{todayCount}</span>
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5 shrink-0" /> {t('tabs.all')}
                  <span className="rounded-full bg-secondary px-1.5 text-[11px]">{countFor('all')}</span>
                </>
              )}
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
            <DropdownMenuItem onClick={() => onChange('today')}>
              <Sun className="h-3.5 w-3.5 text-amber-400" /> {t('tabs.today')}
              <span className="ml-auto text-xs text-muted-foreground">{todayCount}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange('all')}>
              <Layers className="h-3.5 w-3.5" /> {t('tabs.all')}
              <span className="ml-auto text-xs text-muted-foreground">{countFor('all')}</span>
            </DropdownMenuItem>
            {categories.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => onChange(c.id)}>
                <DynamicIcon name={c.icon} className="h-3.5 w-3.5" style={{ color: c.color }} />
                {c.name}
                <span className="ml-auto text-xs text-muted-foreground">{countFor(c.id)}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> {t('tabs.newCategory')}
            </DropdownMenuItem>
            {current && (
              <>
                <DropdownMenuItem onClick={() => openEdit(current)}>
                  <Pencil className="h-3.5 w-3.5" /> {t('tabs.editCategory', { name: current.name })}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => remove(current)}>
                  <Trash2 className="h-3.5 w-3.5" /> {t('tabs.deleteCategory', { name: current.name })}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div role="tablist" className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex">
      <button role="tab" aria-selected={active === 'today'} onClick={() => onChange('today')}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active === 'today' ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'}`}>
        <Sun className="h-3.5 w-3.5 text-amber-400" /> {t('tabs.today')}
        <span className={`ml-0.5 rounded-full px-1.5 text-[11px] ${todayCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-secondary'}`}>{todayCount}</span>
      </button>
      <button role="tab" aria-selected={active === 'all'} onClick={() => onChange('all')}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active === 'all' ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'}`}>
        <Layers className="h-3.5 w-3.5" /> {t('tabs.all')}
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
          <button onClick={() => openEdit(c)} aria-label={t('tabs.editCategory', { name: c.name })} title={t('tabs.editCategory', { name: c.name })} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100"><Pencil className="h-3 w-3" /></button>
          <button onClick={() => remove(c)} aria-label={t('tabs.deleteCategory', { name: c.name })} title={t('tabs.deleteCategory', { name: c.name })} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      <button onClick={openNew} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent">
        <Plus className="h-3.5 w-3.5" /> {t('tabs.addCategory')}
      </button>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2 py-1">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t('tabs.searchAria')}
          placeholder={t('tabs.searchPlaceholder')}
          className="w-28 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:w-40" />
      </div>
      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />
    </div>
  )
}
