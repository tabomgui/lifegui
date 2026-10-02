import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { FileText, Link2, Plus, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEnabledModules } from '@/hooks/use-modules'
import { useBrainNotes, useCreateNoteLink, useDeleteNoteLink } from '@/hooks/use-brain'
import type { NoteLink } from '@/types/api'

/**
 * Seção "Notas do vault" pros dialogs de tarefa e hábito: lista os vínculos
 * atuais e permite buscar uma nota e vincular. Só renderiza com o módulo
 * Cérebro habilitado; vínculo quebrado (nota renomeada no Obsidian) aparece
 * marcado, com remoção pra revincular.
 */
export function NoteLinksSection({ type, id, links }: {
  type: 'task' | 'habit'
  id: number
  links: NoteLink[]
}) {
  const { t } = useTranslation('brain')
  const { isEnabled } = useEnabledModules()
  const createLink = useCreateNoteLink()
  const deleteLink = useDeleteNoteLink()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const { data: notes = [] } = useBrainNotes(q ? { q } : {})

  if (!isEnabled('brain')) return null

  const linkedPaths = new Set(links.map((l) => l.note_path))
  const options = notes.filter((n) => !linkedPaths.has(n.path)).slice(0, 8)

  async function add(notePath: string) {
    try {
      await createLink.mutateAsync({ type, id, note_path: notePath })
      setOpen(false)
      setQ('')
    } catch {
      toast.error(t('linkPicker.linkError'))
    }
  }

  async function remove(link: NoteLink) {
    try {
      await deleteLink.mutateAsync(link.id)
    } catch {
      toast.error(t('linkPicker.unlinkError'))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('linkPicker.label')}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" /> {t('linkPicker.linkButton')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <Input
              placeholder={t('linkPicker.searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mb-2 h-8 text-sm"
              autoFocus
            />
            <div className="max-h-48 space-y-0.5 overflow-auto">
              {options.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">{t('linkPicker.empty')}</p>
              ) : (
                options.map((n) => (
                  <button
                    key={n.path}
                    type="button"
                    onClick={() => add(n.path)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{n.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {n.path.split('/')[0]}
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map((link) => (
            <span
              key={link.id}
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
                link.exists ? 'bg-muted' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {link.exists ? <Link2 className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
              {link.exists ? link.title : t('linkPicker.notFound', { title: link.title })}
              <button
                type="button"
                aria-label={t('linkPicker.removeAria', { title: link.title })}
                onClick={() => remove(link)}
                className="ml-0.5 rounded p-0.5 hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
