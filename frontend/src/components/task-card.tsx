import { useState } from 'react'
import { Circle, Play, Check, Undo2, Trash2, CircleDashed, ChevronDown, Calendar, CalendarOff, ListChecks, SquarePen, CheckSquare, Square, Star } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/api'
import { useMoveTask, useDeferredDeleteTask, useSetTaskPriority, useUpdateTaskCategory, useUpdateTaskDueDate } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { DynamicIcon } from '@/components/icon'
import { dueDateMeta, isoOffset, TONE_CLASSES } from '@/lib/due-date'
import { TaskDialog } from '@/components/task-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const NEXT: Record<TaskStatus, { to: TaskStatus; icon: typeof Play; label: string }[]> = {
  todo: [{ to: 'doing', icon: Play, label: 'Fazendo' }],
  doing: [{ to: 'done', icon: Check, label: 'Feito' }, { to: 'todo', icon: Undo2, label: 'A fazer' }],
  done: [{ to: 'doing', icon: Undo2, label: 'Fazendo' }],
}

function TaskCategoryMenu({ task }: { task: Task }) {
  const { data: categories = [] } = useCategories()
  const updateCategory = useUpdateTaskCategory()
  const current = categories.find((c) => c.id === task.category_id)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={current ? `Categoria: ${current.name}` : 'Definir categoria'}
          title={current ? current.name : 'Sem categoria'}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent">
          {current
            ? <DynamicIcon name={current.icon} className="h-3.5 w-3.5" style={{ color: current.color }} />
            : <CircleDashed className="h-3.5 w-3.5" />}
          <span className="max-w-20 truncate">{current ? current.name : 'Sem categoria'}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => updateCategory.mutate({ id: task.id, category_id: null })}>
          <CircleDashed className="h-3.5 w-3.5" /> Sem categoria
        </DropdownMenuItem>
        {categories.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => updateCategory.mutate({ id: task.id, category_id: c.id })}>
            <DynamicIcon name={c.icon} className="h-3.5 w-3.5" style={{ color: c.color }} /> {c.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TaskDueControl({ task }: { task: Task }) {
  const [open, setOpen] = useState(false)
  const updateDueDate = useUpdateTaskDueDate()
  const meta = dueDateMeta(task.due_date)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {meta ? (
          <button
            aria-label={`Prazo: ${meta.label}`}
            title={meta.label}
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] ${TONE_CLASSES[meta.tone]}`}>
            <Calendar className="h-3 w-3" /> {meta.label}
          </button>
        ) : (
          <button
            aria-label="Definir prazo"
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground opacity-100 transition-opacity hover:bg-accent md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100 data-[state=open]:opacity-100">
            <Calendar className="h-3.5 w-3.5" /> Prazo
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="mb-2 flex gap-1">
          {([['Hoje', 0], ['Amanhã', 1], ['Próx. semana', 7]] as const).map(([label, offset]) => (
            <button
              key={label}
              onClick={() => {
                updateDueDate.mutate({ id: task.id, due_date: isoOffset(offset) })
                setOpen(false)
              }}
              className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent">
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={task.due_date ?? ''}
            onChange={(e) => updateDueDate.mutate({ id: task.id, due_date: e.target.value || null })}
            className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          {task.due_date && (
            <button
              aria-label="Remover prazo"
              title="Remover prazo"
              onClick={() => {
                updateDueDate.mutate({ id: task.id, due_date: null })
                setOpen(false)
              }}
              className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent">
              <CalendarOff className="h-4 w-4" />
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function TaskCard({ task }: { task: Task }) {
  const move = useMoveTask()
  const deferredDelete = useDeferredDeleteTask()
  const setPriority = useSetTaskPriority()
  const [open, setOpen] = useState(false)
  const subtasksCount = task.subtasks_count ?? 0

  return (
    <div draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}
      onClick={(e) => {
        // Clicar no card abre a edição — exceto quando o clique é num controle interativo
        // (botões/menus/inputs) ou num texto selecionado.
        if ((e.target as HTMLElement).closest('button, input, a, [role="menu"]')) return
        if (window.getSelection()?.toString()) return
        setOpen(true)
      }}
      className={`group cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${task.is_priority ? 'border-l-2 border-l-amber-400' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm leading-snug ${task.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>
          {task.title}
        </p>
        <button
          aria-label={task.is_priority ? 'Remover prioridade' : 'Marcar como prioridade'}
          aria-pressed={task.is_priority}
          title={task.is_priority ? 'Remover prioridade' : 'Marcar como prioridade'}
          onClick={() => setPriority.mutate({ id: task.id, is_priority: !task.is_priority })}
          className={`shrink-0 rounded p-0.5 hover:bg-accent ${task.is_priority ? '' : 'opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100'}`}>
          <Star className={`h-4 w-4 ${task.is_priority ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <TaskDueControl task={task} />
        {subtasksCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ListChecks className="h-3 w-3" /> {task.subtasks_done_count ?? 0}/{subtasksCount}
          </span>
        )}
      </div>
      {task.subtasks && task.subtasks.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {task.subtasks.slice(0, 3).map((s) => (
            <li key={s.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {s.done
                ? <CheckSquare className="h-3 w-3 shrink-0 text-emerald-500" />
                : <Square className="h-3 w-3 shrink-0" />}
              <span className={`truncate ${s.done ? 'line-through' : ''}`}>{s.title}</span>
            </li>
          ))}
          {task.subtasks.length > 3 && (
            <li className="pl-[18px] text-[11px] text-muted-foreground/70">+{task.subtasks.length - 3} mais</li>
          )}
        </ul>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-1">
        <div className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100">
          <TaskCategoryMenu task={task} />
        </div>
        <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100">
          <button aria-label="Editar tarefa" title="Editar tarefa" onClick={() => setOpen(true)} className="rounded p-1 hover:bg-accent">
            <SquarePen className="h-3.5 w-3.5" />
          </button>
          {NEXT[task.status].map(({ to, icon: Icon, label }) => (
            <button key={to} aria-label={`Mover para ${label}`} title={`Mover para ${label}`}
              onClick={() => move.mutate({ id: task.id, status: to })}
              className="rounded p-1 hover:bg-accent"><Icon className="h-3.5 w-3.5" /></button>
          ))}
          <button aria-label="Apagar tarefa" title="Apagar tarefa" onClick={() => deferredDelete(task)} className="rounded p-1 hover:bg-accent">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <TaskDialog taskId={task.id} open={open} onOpenChange={setOpen} />
    </div>
  )
}

export const STATUS_META: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  todo: { label: 'A fazer', icon: Circle },
  doing: { label: 'Fazendo', icon: Play },
  done: { label: 'Feito', icon: Check },
}
