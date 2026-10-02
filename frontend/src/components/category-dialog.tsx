import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories'
import { CATEGORY_ICONS, DynamicIcon } from '@/components/icon'
import type { Category } from '@/types/api'
import { toast } from 'sonner'

const ICONS = CATEGORY_ICONS
const COLORS = ['#64748b', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

export function CategoryDialog({
  open, onOpenChange, category,
}: { open: boolean; onOpenChange: (o: boolean) => void; category?: Category | null }) {
  const { t } = useTranslation(['tasks', 'common'])
  const create = useCreateCategory()
  const update = useUpdateCategory()
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
    if (!name.trim()) return toast.error(t('dialog.nameRequired'))
    try {
      if (category) await update.mutateAsync({ id: category.id, name, color, icon })
      else await create.mutateAsync({ name, color, icon })
      onOpenChange(false)
    } catch {
      toast.error(t('dialog.saveError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{category ? t('dialog.editTitle') : t('dialog.newTitle')}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave() }}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">{t('dialog.nameLabel')}</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('dialog.colorLabel')}</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('dialog.iconLabel')}</Label>
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
            <Button type="submit">{t('common:actions.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
