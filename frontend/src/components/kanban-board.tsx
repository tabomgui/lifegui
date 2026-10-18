import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task, TaskStatus } from '@/types/api'
import { useMoveTask } from '@/hooks/use-tasks'
import { TaskCard, STATUS_META } from '@/components/task-card'

const COLUMNS: TaskStatus[] = ['todo', 'doing', 'done']

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const { t } = useTranslation('tasks')
  const move = useMoveTask()
  const [over, setOver] = useState<TaskStatus | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeCol, setActiveCol] = useState(0)

  function onDrop(status: TaskStatus, e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setOver(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    move.mutate({ id, status })
  }

  // Rastreia a coluna visível (mobile) pelo scroll horizontal.
  function onScroll() {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setActiveCol(Math.max(0, Math.min(COLUMNS.length - 1, i)))
  }

  function goTo(i: number) {
    const el = scrollRef.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 snap-x snap-mandatory overflow-auto py-3 md:snap-none md:p-6"
      >
        <div className="flex h-full gap-0 md:grid md:grid-cols-3 md:gap-4">
          {COLUMNS.map((status) => {
            const colTasks = tasks
              .filter((t) => t.status === status)
              .sort((a, b) => Number(b.is_priority) - Number(a.is_priority) || a.position - b.position)
            const label = t(`board.columns.${status}`)
            const Icon = STATUS_META[status].icon
            return (
              <div key={status} className="flex min-h-0 w-full shrink-0 snap-start flex-col border-y bg-muted/30 md:w-auto md:rounded-lg md:border">
                <div className="flex items-center justify-between px-4 py-2.5 md:px-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4" /> {label}</div>
                  <span className="rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground">{colTasks.length}</span>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setOver(status) }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null) }}
                  onDrop={(e) => onDrop(status, e)}
                  className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-3 md:p-2 ${over === status ? 'bg-accent outline-2 outline-dashed outline-ring -outline-offset-4' : ''}`}>
                  {colTasks.map((t) => <TaskCard key={t.id} task={t} />)}
                  {colTasks.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed py-6 text-xs text-muted-foreground/60">
                      {t('board.empty')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* indicador de página (só mobile) */}
      <div className="flex shrink-0 items-center justify-center gap-1.5 py-2 md:hidden">
        {COLUMNS.map((status, i) => (
          <button
            key={status}
            onClick={() => goTo(i)}
            aria-label={t('board.goToColumn', { label: t(`board.columns.${status}`) })}
            aria-current={i === activeCol}
            className={`h-1.5 rounded-full transition-all ${i === activeCol ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
          />
        ))}
      </div>
    </div>
  )
}
