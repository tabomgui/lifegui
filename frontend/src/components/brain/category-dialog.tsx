import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateBrainCategory, useUpdateBrainCategory } from '@/hooks/use-brain'
import { CATEGORY_ICONS, DynamicIcon } from '@/components/icon'
import type { BrainCategory } from '@/types/api'
import { toast } from 'sonner'

const ICONS = CATEGORY_ICONS
const COLORS = ['#64748b', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

export function BrainCategoryDialog({
  open, onOpenChange, category,
}: { open: boolean; onOpenChange: (o: boolean) => void; category?: BrainCategory | null }) {
  const create = useCreateBrainCategory()
  const update = useUpdateBrainCategory()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [icon, setIcon] = useState(ICONS[0])

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '')
      setColor(category?.color ?? COLORS[0])
      setIcon(category?.icon ?? ICONS[0])
    }
  }, [open, category])

  async function onSave() {
    if (!name.trim()) return toast.error('Dê um nome à categoria')
    try {
      if (category) await update.mutateAsync({ current: category.name, name: name.trim(), color, icon })
      else await create.mutateAsync({ name: name.trim(), color, icon })
      onOpenChange(false)
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status
      toast.error(status === 409 ? 'Já existe uma categoria com esse nome' : 'Não foi possível salvar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{category ? 'Editar' : 'Nova'} categoria</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave() }}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brain-cat-name">Nome</Label>
              <Input id="brain-cat-name" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="text-xs text-muted-foreground">Vira uma pasta no vault; renomear move as notas junto.</p>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-8 gap-1.5">
                {ICONS.map((i) => (
                  <button key={i} type="button" onClick={() => setIcon(i)} aria-label={i} aria-pressed={icon === i}
                    className={`flex h-8 w-8 items-center justify-center rounded-md border ${icon === i ? 'border-foreground bg-accent' : 'border-transparent hover:bg-accent'}`}>
                    <DynamicIcon name={i} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={create.isPending || update.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
