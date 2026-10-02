import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Kanban, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCategories } from '@/hooks/use-categories'
import { useCreateTask } from '@/hooks/use-tasks'
import { useCreateNoteLink } from '@/hooks/use-brain'
import { useEnabledModules } from '@/hooks/use-modules'

/**
 * "Criar tarefa" a partir da nota aberta no painel: cria a task (título
 * pré-preenchido, categoria e prazo opcionais) e vincula a nota a ela.
 */
export function TaskFromNote({ notePath, noteTitle }: { notePath: string; noteTitle: string }) {
  const { t } = useTranslation('brain')
  const { isEnabled } = useEnabledModules()
  const { data: categories = [] } = useCategories()
  const createTask = useCreateTask()
  const createLink = useCreateNoteLink()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [due, setDue] = useState('')

  if (!isEnabled('tasks')) return null

  function openForm(next: boolean) {
    if (next) {
      setTitle(noteTitle)
      setCategoryId(categories[0]?.id ?? null)
      setDue('')
    }
    setOpen(next)
  }

  const category = categories.find((c) => c.id === categoryId) ?? null
  const pending = createTask.isPending || createLink.isPending

  async function submit() {
    if (!title.trim()) return
    try {
      const task = await createTask.mutateAsync({
        title: title.trim(),
        category_id: categoryId,
        due_date: due || null,
      })
      await createLink.mutateAsync({ type: 'task', id: task.id, note_path: notePath })
      toast.success(t('taskFromNote.success'))
      setOpen(false)
    } catch {
      toast.error(t('taskFromNote.error'))
    }
  }

  return (
    <Popover open={open} onOpenChange={openForm}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs">
          <Plus className="mr-1 h-3.5 w-3.5" /> {t('taskFromNote.trigger')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-from-note-title">{t('taskFromNote.titleLabel')}</Label>
          <Input
            id="task-from-note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('taskFromNote.categoryLabel')}</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full justify-start">
                <Kanban className="mr-1.5 h-3.5 w-3.5" />
                {category?.name ?? t('taskFromNote.noCategory')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
              <DropdownMenuItem onClick={() => setCategoryId(null)}>{t('taskFromNote.noCategory')}</DropdownMenuItem>
              {categories.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => setCategoryId(c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-from-note-due">{t('taskFromNote.dueLabel')}</Label>
          <Input
            id="task-from-note-due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
        <Button size="sm" className="w-full" onClick={submit} disabled={pending || !title.trim()}>
          {t('taskFromNote.submit')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
