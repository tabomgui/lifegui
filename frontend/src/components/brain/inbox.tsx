import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Inbox as InboxIcon, Plus, Trash2 } from 'lucide-react'
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
import { useBrainInbox, useCaptureInbox, useDiscardInbox, usePromoteInbox } from '@/hooks/use-brain'
import type { BrainCategory, InboxItem } from '@/types/api'

export function CaptureBar() {
  const { t } = useTranslation('brain')
  const capture = useCaptureInbox()
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')

  async function submit() {
    if (!content.trim()) return
    try {
      await capture.mutateAsync({ content, ...(title.trim() ? { title: title.trim() } : {}) })
      setContent('')
      setTitle('')
      toast.success(t('inbox.captureSuccess'))
    } catch {
      toast.error(t('inbox.captureError'))
    }
  }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <Textarea
        placeholder={t('inbox.capturePlaceholder')}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[72px] text-sm"
      />
      <div className="flex gap-2">
        <Input
          placeholder={t('inbox.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={submit} disabled={capture.isPending || !content.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {t('inbox.captureButton')}
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
  const { t } = useTranslation('brain')
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
      toast.success(t('inbox.promote.success'))
      onClose()
    } catch {
      toast.error(t('inbox.promote.error'))
    }
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inbox.promote.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('inbox.promote.categoryLabel')}</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  {category || t('inbox.promote.chooseCategory')}
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
            <Label htmlFor="promote-title">{t('inbox.promote.titleLabel')}</Label>
            <Input id="promote-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promote-resumo">{t('inbox.promote.resumoLabel')}</Label>
            <Input id="promote-resumo" value={resumo} onChange={(e) => setResumo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={promote.isPending || !category || !title.trim()}>
            {t('inbox.promote.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Torna URLs do preview clicáveis (abre em nova aba), mantendo o resto como texto.
function LinkifiedPreview({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return (
    <p className="line-clamp-2 break-all text-xs text-muted-foreground">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2 hover:text-primary"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  )
}

export function InboxList({ categories }: { categories: BrainCategory[] }) {
  const { t } = useTranslation('brain')
  const { data } = useBrainInbox()
  const items = data?.data ?? []
  const [promoting, setPromoting] = useState<InboxItem | null>(null)
  const discard = useDiscardInbox()

  async function discardItem(item: InboxItem) {
    if (!confirm(t('inbox.discardConfirm', { title: item.title }))) return
    try {
      await discard.mutateAsync(item.path)
      toast.success(t('inbox.discardSuccess'))
    } catch {
      toast.error(t('inbox.discardError'))
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        <InboxIcon className="h-6 w-6" />
        {t('inbox.empty')}
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
              <LinkifiedPreview text={item.preview} />
              {item.captured_at && (
                <p className="mt-1 text-[11px] text-muted-foreground/70">{item.captured_at}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => setPromoting(item)}>
                <ArrowRight className="mr-1 h-3.5 w-3.5" /> {t('inbox.turnIntoNote')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => discardItem(item)}
                disabled={discard.isPending}
                aria-label={t('inbox.discardAria', { title: item.title })}
                title={t('inbox.discardTitle')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <PromoteDialog item={promoting} categories={categories} onClose={() => setPromoting(null)} />
    </>
  )
}
