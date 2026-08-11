import { Circle, Play, Check, Undo2, Trash2 } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/api'
import { useMoveTask, useDeleteTask } from '@/hooks/use-tasks'

const NEXT: Record<TaskStatus, { to: TaskStatus; icon: typeof Play; label: string }[]> = {
  todo: [{ to: 'doing', icon: Play, label: 'Fazendo' }],
  doing: [{ to: 'done', icon: Check, label: 'Feito' }, { to: 'todo', icon: Undo2, label: 'A fazer' }],
  done: [{ to: 'doing', icon: Undo2, label: 'Fazendo' }],
}

export function TaskCard({ task }: { task: Task }) {
  const move = useMoveTask()
  const del = useDeleteTask()

  return (
    <div draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}
      className="group cursor-grab rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing">
      <p className={`text-sm leading-snug ${task.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>{task.title}</p>
      <div className="mt-2.5 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100">
        {NEXT[task.status].map(({ to, icon: Icon, label }) => (
          <button key={to} aria-label={`Mover para ${label}`} title={`Mover para ${label}`}
            onClick={() => move.mutate({ id: task.id, status: to })}
            className="rounded p-1 hover:bg-accent"><Icon className="h-3.5 w-3.5" /></button>
        ))}
        <button aria-label="Apagar tarefa" title="Apagar tarefa" onClick={() => del.mutate(task.id)} className="rounded p-1 hover:bg-accent">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export const STATUS_META: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  todo: { label: 'A fazer', icon: Circle },
  doing: { label: 'Fazendo', icon: Play },
  done: { label: 'Feito', icon: Check },
}
