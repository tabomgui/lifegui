import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, Inbox as InboxIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBrainInbox, useCaptureInbox, usePromoteInbox } from '@/hooks/use-brain'
import type { BrainCategory, InboxItem } from '@/types/api'

export function CaptureBar() {
  const capture = useCaptureInbox()
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')

  async function submit() {
    if (!content.trim()) return
    try {
      await capture.mutateAsync({ content, ...(title.trim() ? { title: title.trim() } : {}) })
      setContent('')
      setTitle('')
      toast.success('Capturado no inbox')
    } catch {
      toast.error('Não foi possível capturar')
    }
  }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <Textarea
        placeholder="Cole um link ou texto pra guardar…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[72px] text-sm"
      />
      <div className="flex gap-2">
        <Input
          placeholder="Título (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={submit} disabled={capture.isPending || !content.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Capturar
        </Button>
      </div>
    </div>
  )
}

function PromoteDialog({ item, categories, onClose }: {
  item: InboxItem | null
  categories: BrainCategory[]
  onClose: () => void
}) {
  const promote = usePromoteInbox()
  const [category, setCategory] = useState<string>('')
  const [title, setTitle] = useState('')
  const [resumo, setResumo] = useState('')

  // Reinicia os campos quando abre pra um item novo.
  const [lastPath, setLastPath] = useState<string | null>(null)
  if (item && item.path !== lastPath) {
    setLastPath(item.path)
    setCategory(categories[0]?.name ?? '')
    setTitle(item.title.startsWith('captura-') ? '' : item.title)
    setResumo('')
  }

  async function submit() {
    if (!item || !category || !title.trim()) return
    try {
      await promote.mutateAsync({
        path: item.path,
        category,
        title: title.trim(),
        ...(resumo.trim() ? { resumo: resumo.trim() } : {}),
      })
      toast.success('Nota criada')
      onClose()
    } catch {
      toast.error('Não foi possível criar a nota')
    }
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transformar em nota</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  {category || 'Escolher categoria'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {categories.map((c) => (
                  <DropdownMenuItem key={c.name} onClick={() => setCategory(c.name)}>
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promote-title">Título da nota</Label>
            <Input id="promote-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promote-resumo">Resumo (opcional)</Label>
            <Input id="promote-resumo" value={resumo} onChange={(e) => setResumo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={promote.isPending || !category || !title.trim()}>
            Criar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InboxList({ categories }: { categories: BrainCategory[] }) {
  const { data } = useBrainInbox()
  const items = data?.data ?? []
  const [promoting, setPromoting] = useState<InboxItem | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        <InboxIcon className="h-6 w-6" />
        Inbox vazio. Capture um link ou texto acima.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.path} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="line-clamp-2 break-all text-xs text-muted-foreground">{item.preview}</p>
              {item.captured_at && (
                <p className="mt-1 text-[11px] text-muted-foreground/70">{item.captured_at}</p>
              )}
            </div>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => setPromoting(item)}>
              <ArrowRight className="mr-1 h-3.5 w-3.5" /> Virar nota
            </Button>
          </div>
        ))}
      </div>
      <PromoteDialog item={promoting} categories={categories} onClose={() => setPromoting(null)} />
    </>
  )
}
