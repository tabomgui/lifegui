import { useState } from 'react'
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
import { useCreateNote } from '@/hooks/use-brain'

export function NewNoteDialog({ open, category, onClose, onCreated }: {
  open: boolean
  category: string
  onClose: () => void
  onCreated: (path: string) => void
}) {
  const create = useCreateNote()
  const [title, setTitle] = useState('')
  const [fonte, setFonte] = useState('')
  const [resumo, setResumo] = useState('')
  const [tags, setTags] = useState('')

  async function submit() {
    if (!title.trim()) return
    try {
      const note = await create.mutateAsync({
        category,
        title: title.trim(),
        ...(fonte.trim() ? { fonte: fonte.trim() } : {}),
        ...(resumo.trim() ? { resumo: resumo.trim() } : {}),
        ...(tags.trim() ? { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) } : {}),
      })
      setTitle(''); setFonte(''); setResumo(''); setTags('')
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
          <DialogTitle>Nova nota em {category}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">Título</Label>
            <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
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
          <Button onClick={submit} disabled={create.isPending || !title.trim()}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
