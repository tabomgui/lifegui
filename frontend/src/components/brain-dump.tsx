import { useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useProcessTasks } from '@/hooks/use-tasks'
import { useCategories } from '@/hooks/use-categories'
import { DynamicIcon } from '@/components/icon'
import { toast } from 'sonner'

export function BrainDump({ activeCategoryId }: { activeCategoryId: number | null }) {
  const process = useProcessTasks()
  const { data: categories = [] } = useCategories()
  const [text, setText] = useState('')

  const activeCategory = categories.find((c) => c.id === activeCategoryId)

  async function onProcess() {
    if (!text.trim()) return toast.error('Escreva ao menos uma tarefa')
    try {
      const created = await process.mutateAsync({ text, categoryId: activeCategoryId })
      setText('')
      toast.success(`${created.length} tarefa(s) processada(s)`)
    } catch {
      toast.error('Não foi possível processar')
    }
  }

  return (
    <div className="border-b bg-card/30 px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-lg border bg-card p-2 shadow-sm">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-2.5 ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
          <Textarea value={text} onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }} rows={1}
            placeholder="Jogue tudo aqui — uma tarefa por linha…"
            className="min-h-[38px] resize-none border-0 shadow-none focus-visible:ring-0" />
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          {activeCategory
            ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <DynamicIcon name={activeCategory.icon} className="h-3.5 w-3.5" style={{ color: activeCategory.color }} />
                novas tarefas irão para {activeCategory.name}
              </span>
            )
            : <span />}
          <Button size="sm" onClick={onProcess} disabled={process.isPending}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Processar
          </Button>
        </div>
      </div>
    </div>
  )
}
