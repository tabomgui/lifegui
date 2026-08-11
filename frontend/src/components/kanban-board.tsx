import { useState } from 'react'
import type { DragEvent } from 'react'
import type { Task, TaskStatus } from '@/types/api'
import { useMoveTask } from '@/hooks/use-tasks'
import { TaskCard, STATUS_META } from '@/components/task-card'

const COLUMNS: TaskStatus[] = ['todo', 'doing', 'done']

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const move = useMoveTask()
  const [over, setOver] = useState<TaskStatus | null>(null)

  function onDrop(status: TaskStatus, e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setOver(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    move.mutate({ id, status })
  }

  return (
    <div className="min-h-0 flex-1 snap-x snap-mandatory overflow-auto p-4 md:snap-none md:p-6">
      <div className="flex h-full gap-4 md:grid md:grid-cols-3">
        {COLUMNS.map((status) => {
          const colTasks = tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position)
          const { label, icon: Icon } = STATUS_META[status]
          return (
            <div key={status} className="flex min-h-0 shrink-0 basis-[85%] snap-start flex-col rounded-lg border bg-muted/30 md:basis-auto">
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4" /> {label}</div>
                <span className="rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground">{colTasks.length}</span>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setOver(status) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null) }}
                onDrop={(e) => onDrop(status, e)}
                className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 ${over === status ? 'bg-accent outline-2 outline-dashed outline-ring -outline-offset-4' : ''}`}>
                {colTasks.map((t) => <TaskCard key={t.id} task={t} />)}
                {colTasks.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-md border border-dashed py-6 text-xs text-muted-foreground/60">
                    Solte tarefas aqui
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
