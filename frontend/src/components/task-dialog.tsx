import { useEffect, useState } from 'react'
import { CheckSquare, Loader2, Plus, Square, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTaskDetail, useUpdateTask, useAddSubtask, useUpdateSubtask, useDeleteSubtask } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { NoteLinksSection } from '@/components/brain/note-link-picker'
import { ScheduleSection } from '@/components/calendar/schedule-section'
import type { Subtask } from '@/types/api'

function SubtaskRow({ taskId, subtask }: { taskId: number; subtask: Subtask }) {
  const { t } = useTranslation('tasks')
  const updateSubtask = useUpdateSubtask()
  const deleteSubtask = useDeleteSubtask()

  return (
    <div className="flex items-center gap-2 py-1">
      <button
        type="button"
        aria-pressed={subtask.done}
        aria-label={subtask.done ? t('subtasks.markUndone', { title: subtask.title }) : t('subtasks.markDone', { title: subtask.title })}
        onClick={() => updateSubtask.mutate({ taskId, subtaskId: subtask.id, done: !subtask.done })}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground">
        {subtask.done ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      <span className={`flex-1 text-sm ${subtask.done ? 'text-muted-foreground line-through' : ''}`}>
        {subtask.title}
      </span>
      <button
        type="button"
        aria-label={t('subtasks.remove', { title: subtask.title })}
        onClick={() => deleteSubtask.mutate({ taskId, subtaskId: subtask.id })}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function SubtasksSection({ taskId, subtasks }: { taskId: number; subtasks: Subtask[] }) {
  const { t } = useTranslation('tasks')
  const addSubtask = useAddSubtask()
  const [newTitle, setNewTitle] = useState('')

  const done = subtasks.filter((s) => s.done).length
  const total = subtasks.length

  function onAdd() {
    const title = newTitle.trim()
    if (!title) return
    addSubtask.mutate({ taskId, title })
    setNewTitle('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('subtasks.label')}</Label>
        <span className="text-xs text-muted-foreground">{done}/{total}</span>
      </div>
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {subtasks.map((s) => (
          <SubtaskRow key={s.id} taskId={taskId} subtask={s} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd()
            }
          }}
          placeholder={t('subtasks.newPlaceholder')}
          aria-label={t('subtasks.newPlaceholder')}
        />
        <Button type="button" size="icon" variant="outline" aria-label={t('subtasks.addAria')} onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function TaskDialog({
  taskId, open, onOpenChange,
}: { taskId: number | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation(['tasks', 'common'])
  const { data: task, isPending } = useTaskDetail(open ? taskId : null)
  const { data: categories = [] } = useCategories()
  const updateTask = useUpdateTask()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [categoryId, setCategoryId] = useState('')

  // Reseeda ao abrir (e quando a task carrega/muda), pra descartar edições não salvas
  // de uma abertura anterior — mesmo padrão de habit-dialog/category-dialog.
  useEffect(() => {
    if (open && task) {
      setTitle(task.title)
      setNotes(task.notes ?? '')
      setDueDate(task.due_date ?? '')
      setCategoryId(task.category_id != null ? String(task.category_id) : '')
    }
  }, [open, task])

  async function onSave() {
    if (!task) return
    if (!title.trim()) return toast.error(t('taskDialog.titleRequired'))
    try {
      await updateTask.mutateAsync({
        id: task.id,
        title,
        notes: notes || null,
        due_date: dueDate || null,
        category_id: categoryId ? Number(categoryId) : null,
      })
      toast.success(t('taskDialog.saved'))
      onOpenChange(false)
    } catch {
      toast.error(t('taskDialog.saveError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('taskDialog.editTitle')}</DialogTitle></DialogHeader>
        {isPending || !task ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onSave() }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">{t('taskDialog.titleLabel')}</Label>
                <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-notes">{t('taskDialog.descriptionLabel')}</Label>
                <Textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-due">{t('taskDialog.dueLabel')}</Label>
                  <input
                    id="task-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-category">{t('taskDialog.categoryLabel')}</Label>
                  <select
                    id="task-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                    <option value="">{t('card.noCategory')}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <SubtasksSection taskId={task.id} subtasks={task.subtasks ?? []} />
              <NoteLinksSection type="task" id={task.id} links={task.note_links ?? []} />
              <ScheduleSection type="task" refId={String(task.id)} title={task.title} />
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={updateTask.isPending}>{t('common:actions.save')}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
