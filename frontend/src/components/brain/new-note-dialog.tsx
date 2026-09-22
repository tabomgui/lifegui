import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBrainCategories, useCreateNote } from '@/hooks/use-brain'

/**
 * Dialog de nova nota. `category` fixa a categoria (aba atual); sem ela,
 * mostra um select — caso dos fluxos "criar a partir de [[link]] quebrado".
 * `initialTitle` pré-preenche (título do wikilink); `initialBody` alimenta o
 * fluxo de extração de nota.
 */
export function NewNoteDialog({ open, category, initialTitle, initialBody, onClose, onCreated }: {
  open: boolean
  category?: string
  initialTitle?: string
  initialBody?: string
  onClose: () => void
  onCreated: (path: string) => void
}) {
  const create = useCreateNote()
  const { data: categoriesData } = useBrainCategories(open && !category)
  const categories = categoriesData?.data ?? []

  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('')
  const [fonte, setFonte] = useState('')
  const [resumo, setResumo] = useState('')
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(initialTitle ?? '')
      setCat(category ?? '')
      setFonte('')
      setResumo('')
      setTags('')
    }
  }, [open, category, initialTitle])

  const effectiveCat = category ?? cat

  async function submit() {
    if (!title.trim() || !effectiveCat) return
    try {
      const note = await create.mutateAsync({
        category: effectiveCat,
        title: title.trim(),
        ...(fonte.trim() ? { fonte: fonte.trim() } : {}),
        ...(resumo.trim() ? { resumo: resumo.trim() } : {}),
        ...(tags.trim() ? { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) } : {}),
        ...(initialBody ? { body: initialBody } : {}),
      })
      onClose()
      onCreated(note.path)
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status
      toast.error(status === 409 ? 'Já existe uma nota com esse título' : 'Não foi possível criar a nota')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? `Nova nota em ${category}` : 'Nova nota'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Título</Label>
            <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          {!category && (
            <div className="space-y-1.5">
              <Label htmlFor="note-cat">Categoria</Label>
              <select
                id="note-cat"
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">Escolher categoria…</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="note-fonte">Fonte (link, opcional)</Label>
            <Input id="note-fonte" value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-resumo">Resumo (opcional)</Label>
            <Input id="note-resumo" value={resumo} onChange={(e) => setResumo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-tags">Tags (separadas por vírgula, opcional)</Label>
            <Input id="note-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending || !title.trim() || !effectiveCat}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
