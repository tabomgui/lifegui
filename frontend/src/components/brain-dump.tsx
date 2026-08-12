import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Ctrl/Cmd+Enter dentro do brain-dump dispara o Processar.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onProcess()
    }
  }

  // Tecla '/' global foca o brain-dump — ignorada quando já se digita num campo.
  useEffect(() => {
    function onGlobalKey(e: globalThis.KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      textareaRef.current?.focus()
    }
    window.addEventListener('keydown', onGlobalKey)
    return () => window.removeEventListener('keydown', onGlobalKey)
  }, [])

  return (
    <div className="border-b bg-card/30 px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 rounded-lg border bg-card p-2 shadow-sm">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-2.5 ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
          <Textarea ref={textareaRef} value={text} onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }} onKeyDown={onKeyDown} rows={1}
            placeholder="Jogue tudo aqui — uma tarefa por linha…"
            className="min-h-[38px] resize-none border-0 shadow-none focus-visible:ring-0" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
            <span>
              Tecla <kbd className="rounded border bg-muted px-1 text-[10px] font-medium">/</kbd> foca aqui · <kbd className="rounded border bg-muted px-1 text-[10px] font-medium">Ctrl</kbd>+<kbd className="rounded border bg-muted px-1 text-[10px] font-medium">Enter</kbd> processa
            </span>
            {activeCategory && (
              <span className="flex items-center gap-1">
                <DynamicIcon name={activeCategory.icon} className="h-3.5 w-3.5" style={{ color: activeCategory.color }} />
                novas tarefas irão para {activeCategory.name}
              </span>
            )}
          </div>
          <Button size="sm" onClick={onProcess} disabled={process.isPending} className="shrink-0">
            <Wand2 className="mr-1.5 h-4 w-4" /> Processar
          </Button>
        </div>
      </div>
    </div>
  )
}
