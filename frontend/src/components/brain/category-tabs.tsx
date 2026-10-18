import { useState } from 'react'
import type { DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Inbox, Pencil, Plus, Search, Trash2, Waypoints } from 'lucide-react'
import { DynamicIcon } from '@/components/icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const { t } = useTranslation('brain')
  const del = useDeleteBrainCategory()
  const reorder = useReorderBrainCategories()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BrainCategory | null>(null)
  const [dragName, setDragName] = useState<string | null>(null)
  const [dropInto, setDropInto] = useState<{ name: string; side: 'left' | 'right' } | null>(null)

  function openNew() { setEditing(null); setDialogOpen(true) }
  function openEdit(c: BrainCategory) { setEditing(c); setDialogOpen(true) }

  async function remove(c: BrainCategory) {
    if (!confirm(t('tabs.deleteConfirm', { name: c.name }))) return
    try {
      await del.mutateAsync(c.name)
      if (active === c.name) onChange(categories.find((x) => x.name !== c.name)?.name ?? INBOX_TAB)
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status
      toast.error(status === 409 ? t('tabs.hasNotesError') : t('tabs.deleteError'))
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

  const current = active === INBOX_TAB ? null : categories.find((c) => c.name === active) ?? null

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
                  <span className="rounded-full bg-secondary px-1.5 text-[11px]">{current.total}</span>
                </>
              ) : (
                <>
                  <Inbox className="h-3.5 w-3.5 shrink-0" />
                  {t('tabs.inbox')}
                  <span className={`rounded-full px-1.5 text-[11px] ${inboxCount > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-secondary'}`}>
                    {inboxCount}
                  </span>
                </>
              )}
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
            <DropdownMenuItem onClick={() => onChange(INBOX_TAB)}>
              <Inbox className="h-3.5 w-3.5" /> {t('tabs.inbox')}
              <span className="ml-auto text-xs text-muted-foreground">{inboxCount}</span>
            </DropdownMenuItem>
            {categories.map((c) => (
              <DropdownMenuItem key={c.name} onClick={() => onChange(c.name)}>
                <DynamicIcon name={c.icon} className="h-3.5 w-3.5" style={{ color: c.color }} />
                {c.name}
                <span className="ml-auto text-xs text-muted-foreground">{c.total}</span>
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
        <button
          role="tab"
          aria-selected={active === INBOX_TAB}
          onClick={() => onChange(INBOX_TAB)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
            active === INBOX_TAB ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          {t('tabs.inbox')}
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
            <button onClick={() => openEdit(c)} aria-label={t('tabs.editCategory', { name: c.name })} title={t('tabs.editCategory', { name: c.name })}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={() => remove(c)} aria-label={t('tabs.deleteCategory', { name: c.name })} title={t('tabs.deleteCategory', { name: c.name })}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button onClick={openNew} className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent">
          <Plus className="h-3.5 w-3.5" /> {t('tabs.addCategory')}
        </button>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {active !== INBOX_TAB && !graphMode && (
          <div className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={t('tabs.searchAria')}
              placeholder={t('tabs.searchPlaceholder')}
              className="w-28 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:w-40"
            />
          </div>
        )}
        <button
          onClick={onToggleGraph}
          aria-pressed={graphMode}
          title={graphMode ? t('tabs.backToNotes') : t('tabs.graphView')}
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
