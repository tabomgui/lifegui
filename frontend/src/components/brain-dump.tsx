import { useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useProcessTasks } from '@/hooks/use-tasks'
import { toast } from 'sonner'

export function BrainDump() {
  const process = useProcessTasks()
  const [text, setText] = useState('')

  async function onProcess() {
    if (!text.trim()) return toast.error('Escreva ao menos uma tarefa')
    try {
      const created = await process.mutateAsync(text)
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
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={1}
            placeholder="Jogue tudo aqui — uma tarefa por linha…"
            className="min-h-[38px] resize-none border-0 shadow-none focus-visible:ring-0" />
        </div>
        <div className="flex items-center justify-end border-t pt-2">
          <Button size="sm" onClick={onProcess} disabled={process.isPending}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Processar
          </Button>
        </div>
      </div>
    </div>
  )
}
