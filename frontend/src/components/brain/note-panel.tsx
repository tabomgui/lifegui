import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { CodeXml, CornerUpRight, ExternalLink, Eye, Kanban, Pencil, Repeat, Scissors, Trash2 } from 'lucide-react'
import { NoteEditor, type NoteEditorApi } from '@/components/brain/note-editor'
import { ScheduleSection } from '@/components/calendar/schedule-section'
import { TagEditor } from '@/components/brain/tag-editor'
import { TaskFromNote } from '@/components/brain/task-from-note'
import { NewNoteDialog } from '@/components/brain/new-note-dialog'
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
import { useBrainNote, useBrainNotes, useDeleteNote, useUpdateNote } from '@/hooks/use-brain'
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
  const del = useDeleteNote()
  const [editing, setEditing] = useState(false)
  // Modo padrão de edição é o editor rico (Crepe); "Texto puro" é a saída de
  // segurança pra sintaxe que o WYSIWYG não conhece.
  const [rawMode, setRawMode] = useState(false)
  const [draft, setDraft] = useState('')
  const editorApiRef = useRef<NoteEditorApi | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Força remount do editor quando o draft muda por fora (troca de modo).
  const [editorKey, setEditorKey] = useState(0)

  // Criar nota a partir de [[link]] quebrado (clicado no texto).
  const [ghostTitle, setGhostTitle] = useState<string | null>(null)
  // Extração: trecho selecionado vira nota nova + [[link]] no lugar.
  const [extract, setExtract] = useState<{ text: string; rawStart?: number; rawEnd?: number } | null>(null)

  useEffect(() => {
    setEditing(false)
    setRawMode(false)
    setDraft('')
  }, [path])

  const byTitle = useMemo(
    () => new Map(allNotes.map((n) => [n.title.toLowerCase(), n.path])),
    [allNotes],
  )
  const noteTitles = useMemo(() => allNotes.map((n) => n.title), [allNotes])

  function currentContent(): string {
    return rawMode ? draft : (editorApiRef.current?.getMarkdown() ?? draft)
  }

  function toggleRaw() {
    if (rawMode) {
      setEditorKey((k) => k + 1)
      setRawMode(false)
    } else {
      setDraft(currentContent())
      setRawMode(true)
    }
  }

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
      await update.mutateAsync({ path: note.path, body: currentContent() })
      setEditing(false)
      toast.success('Nota salva')
    } catch {
      toast.error('Não foi possível salvar')
    }
  }

  async function deleteNote() {
    if (!note) return
    if (!confirm(`Excluir "${note.title}"? Vai pra .trash no vault (recuperável pelo Obsidian).`)) return
    try {
      await del.mutateAsync(note.path)
      toast.success('Nota movida pra lixeira')
      onClose()
    } catch {
      toast.error('Não foi possível excluir')
    }
  }

  function startExtract() {
    if (rawMode) {
      const el = textareaRef.current
      if (!el || el.selectionStart === el.selectionEnd) {
        toast.error('Selecione um trecho pra extrair')
        return
      }
      setExtract({
        text: draft.slice(el.selectionStart, el.selectionEnd),
        rawStart: el.selectionStart,
        rawEnd: el.selectionEnd,
      })
    } else {
      const text = editorApiRef.current?.getSelectionText() ?? ''
      if (!text.trim()) {
        toast.error('Selecione um trecho pra extrair')
        return
      }
      setExtract({ text })
    }
  }

  function onExtracted(newPath: string) {
    const title = newPath.split('/').pop()?.replace(/\.md$/, '') ?? ''
    const link = `[[${title}]]`
    if (extract?.rawStart !== undefined && extract.rawEnd !== undefined) {
      setDraft((d) => d.slice(0, extract.rawStart) + link + d.slice(extract.rawEnd))
    } else {
      editorApiRef.current?.replaceSelection(link)
    }
    setExtract(null)
    toast.success('Trecho extraído — salve a nota pra gravar o link')
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
                <TagEditor path={note.path} tags={note.tags} />
                <div className="ml-auto">
                  {editing ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={startExtract}
                        title="Extrair trecho selecionado pra uma nota nova">
                        <Scissors className="mr-1 h-3.5 w-3.5" /> Extrair
                      </Button>
                      <Button size="sm" variant="ghost" onClick={toggleRaw}
                        title={rawMode ? 'Voltar pro editor' : 'Editar como texto puro'}>
                        <CodeXml className="mr-1 h-3.5 w-3.5" /> {rawMode ? 'Editor' : 'Texto'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={saveBody} disabled={update.isPending}>
                        Salvar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={deleteNote}
                        disabled={del.isPending}
                        aria-label={`Excluir ${note.title}`}
                        title="Excluir nota"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDraft(note.body); setEditorKey((k) => k + 1); setEditing(true) }}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {note.resumo && <p className="text-left text-xs text-muted-foreground">{note.resumo}</p>}
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {editing ? (
                rawMode ? (
                  <Textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-full min-h-[50vh] resize-none font-mono text-sm"
                  />
                ) : (
                  <NoteEditor key={editorKey} defaultValue={draft} apiRef={editorApiRef} noteTitles={noteTitles} />
                )
              ) : (
                <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    // O sanitizador padrão apaga esquemas desconhecidos; o
                    // wikilink: interno precisa sobreviver até o componente <a>.
                    urlTransform={(url) => (url.startsWith('wikilink:') ? url : defaultUrlTransform(url))}
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
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); setGhostTitle(target) }}
                              title="Nota ainda não existe — clique pra criar"
                              className="cursor-pointer text-muted-foreground underline decoration-dashed underline-offset-2"
                            >
                              {children}
                            </a>
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

            {!editing && (
              <div className="space-y-2 border-t p-3">
                <ScheduleSection type="note" refId={note.path} title={`Estudar: ${note.title}`} />
                {note.backlinks.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Mencionada em</p>
                    <div className="flex flex-wrap gap-1.5">
                      {note.backlinks.map((b) => (
                        <button
                          key={b.path}
                          type="button"
                          onClick={() => onNavigate(b.path)}
                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs hover:bg-accent"
                        >
                          <CornerUpRight className="h-3 w-3" />
                          {b.title}
                          <span className="text-muted-foreground/70">· {b.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Vinculado a</p>
                    <TaskFromNote notePath={note.path} noteTitle={note.title} />
                  </div>
                  {note.links.length > 0 ? (
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
                  ) : (
                    <p className="text-xs text-muted-foreground/70">
                      Nenhuma tarefa ou hábito vinculado ainda.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Criar nota a partir de [[link]] quebrado clicado no texto. */}
        <NewNoteDialog
          open={ghostTitle !== null}
          initialTitle={ghostTitle ?? undefined}
          onClose={() => setGhostTitle(null)}
          onCreated={(p) => { setGhostTitle(null); onNavigate(p) }}
        />

        {/* Extrair trecho selecionado pra nota nova. */}
        <NewNoteDialog
          open={extract !== null}
          initialTitle={extract?.text.split(/\s+/).slice(0, 6).join(' ').slice(0, 60)}
          initialBody={extract ? `${extract.text.trim()}\n` : undefined}
          onClose={() => setExtract(null)}
          onCreated={onExtracted}
        />
      </SheetContent>
    </Sheet>
  )
}
