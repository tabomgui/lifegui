import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { ExternalLink, Eye, Kanban, Pencil, Repeat } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NOTE_STATUSES, STATUS_BADGE, STATUS_LABEL } from '@/components/brain/status'
import { useBrainNote, useBrainNotes, useUpdateNote } from '@/hooks/use-brain'
import type { NoteStatus } from '@/types/api'

// Converte [[wikilinks]] em links markdown com esquema próprio pra interceptar
// o clique e navegar entre notas dentro do painel.
function preprocessWikilinks(body: string): string {
  return body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, label?: string) => {
    return `[${label ?? target}](wikilink:${encodeURIComponent(target.trim())})`
  })
}

export function NotePanel({ path, onNavigate, onClose }: {
  path: string | null
  onNavigate: (path: string) => void
  onClose: () => void
}) {
  const { data: note } = useBrainNote(path)
  const { data: allNotes = [] } = useBrainNotes()
  const update = useUpdateNote()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setEditing(false)
    setDraft('')
  }, [path])

  // Índice título → path pra resolver wikilinks contra o vault carregado.
  const byTitle = useMemo(
    () => new Map(allNotes.map((n) => [n.title.toLowerCase(), n.path])),
    [allNotes],
  )

  async function setStatus(status: NoteStatus) {
    if (!note) return
    try {
      await update.mutateAsync({ path: note.path, frontmatter: { status } })
    } catch {
      toast.error('Não foi possível atualizar o status')
    }
  }

  async function saveBody() {
    if (!note) return
    try {
      await update.mutateAsync({ path: note.path, body: draft })
      setEditing(false)
      toast.success('Nota salva')
    } catch {
      toast.error('Não foi possível salvar')
    }
  }

  return (
    <Sheet open={path !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-2xl">
        {note && (
          <>
            <SheetHeader className="border-b pb-3">
              <SheetTitle className="pr-8 text-left">{note.title}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${note.status ? STATUS_BADGE[note.status] : 'bg-muted text-muted-foreground'}`}
                    >
                      {note.status ? STATUS_LABEL[note.status] : 'Sem status'}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {NOTE_STATUSES.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => setStatus(s)}>
                        {STATUS_LABEL[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {note.fonte && (
                  <a
                    href={note.fonte}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" /> fonte
                  </a>
                )}
                {note.tags.map((tag) => (
                  <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {tag}
                  </span>
                ))}
                <div className="ml-auto">
                  {editing ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={saveBody} disabled={update.isPending}>
                        Salvar
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => { setDraft(note.body); setEditing(true) }}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                  )}
                </div>
              </div>
              {note.resumo && <p className="text-left text-xs text-muted-foreground">{note.resumo}</p>}
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {editing ? (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-full min-h-[50vh] resize-none font-mono text-sm"
                />
              ) : (
                <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => {
                        if (href?.startsWith('wikilink:')) {
                          const target = decodeURIComponent(href.slice('wikilink:'.length))
                          const targetPath = byTitle.get(target.toLowerCase())
                          return targetPath ? (
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); onNavigate(targetPath) }}
                              className="cursor-pointer"
                            >
                              {children}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">{children}</span>
                          )
                        }
                        return <a href={href} target="_blank" rel="noreferrer">{children}</a>
                      },
                    }}
                  >
                    {preprocessWikilinks(note.body)}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {note.links.length > 0 && (
              <div className="border-t p-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Vinculado a</p>
                <div className="flex flex-wrap gap-1.5">
                  {note.links.map((link) => (
                    <span
                      key={link.id}
                      className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
                    >
                      {link.type === 'task' ? <Kanban className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}
                      {link.name ?? `#${link.linkable_id}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
