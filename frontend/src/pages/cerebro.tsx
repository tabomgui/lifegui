import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Camera,
  Drum,
  Dumbbell,
  Folder,
  FolderOpen,
  Inbox,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { NoteCard } from '@/components/brain/note-card'
import { NotePanel } from '@/components/brain/note-panel'
import { NewNoteDialog } from '@/components/brain/new-note-dialog'
import { CaptureBar, InboxList } from '@/components/brain/inbox'
import { NOTE_STATUSES, STATUS_DOT, STATUS_LABEL } from '@/components/brain/status'
import { useBrainCategories, useBrainInbox, useBrainNotes } from '@/hooks/use-brain'
import type { NoteStatus } from '@/types/api'

const INBOX_TAB = '__inbox__'

// Ícone por categoria do vault (pastas conhecidas do plano; Folder pro resto).
const CATEGORY_ICON: Record<string, LucideIcon> = {
  IA: Sparkles,
  Receitas: UtensilsCrossed,
  Calistenia: Dumbbell,
  Bateria: Drum,
  Instagram: Camera,
}

export default function Cerebro() {
  const { data: categoriesData, isLoading } = useBrainCategories()
  const categories = categoriesData?.data ?? []
  const initialized = categoriesData?.initialized ?? true
  const { data: inboxData } = useBrainInbox(initialized)
  const inboxCount = inboxData?.data.length ?? 0

  const [tab, setTab] = useState<string | null>(null)
  const active = tab ?? categories[0]?.name ?? INBOX_TAB

  const [status, setStatus] = useState<NoteStatus | null>(null)
  const [q, setQ] = useState('')
  const [openPath, setOpenPath] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const isInbox = active === INBOX_TAB
  const { data: notes = [] } = useBrainNotes(
    isInbox ? {} : { category: active, status, q: q || undefined },
  )

  function switchTab(next: string) {
    setTab(next)
    setStatus(null)
    setQ('')
  }

  const tabClass = (selected: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
      selected ? 'bg-secondary' : 'text-muted-foreground hover:bg-accent'
    }`

  return (
    <AppLayout title="Cérebro">
      <main className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : !initialized ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex max-w-md flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Vault não encontrado</p>
              <p className="text-sm text-muted-foreground">
                O módulo Cérebro gerencia um vault Obsidian no servidor. Crie a pasta do seu
                vault em <code className="rounded bg-muted px-1">VAULTS_PATH/&#123;seu id&#125;</code> com
                as pastas de categoria e recarregue.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Linha de abas no mesmo idioma da página de tarefas. */}
            <div className="flex items-center gap-2 border-b px-4 py-2 md:px-6">
              <div role="tablist" className="flex items-center gap-1 overflow-x-auto">
                {categories.map((c) => {
                  const Icon = CATEGORY_ICON[c.name] ?? Folder
                  return (
                    <button
                      key={c.name}
                      role="tab"
                      aria-selected={active === c.name}
                      onClick={() => switchTab(c.name)}
                      className={tabClass(active === c.name)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {c.name}
                      <span className="ml-0.5 rounded-full bg-secondary px-1.5 text-[11px]">
                        {c.total}
                      </span>
                    </button>
                  )
                })}
                <button
                  role="tab"
                  aria-selected={isInbox}
                  onClick={() => switchTab(INBOX_TAB)}
                  className={tabClass(isInbox)}
                >
                  <Inbox className="h-3.5 w-3.5" />
                  Inbox
                  <span
                    className={`ml-0.5 rounded-full px-1.5 text-[11px] ${
                      inboxCount > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-secondary'
                    }`}
                  >
                    {inboxCount}
                  </span>
                </button>
              </div>
              {!isInbox && (
                <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border bg-card px-2 py-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    aria-label="Buscar notas"
                    placeholder="Buscar notas…"
                    className="w-28 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:w-40"
                  />
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
              <div className="mx-auto max-w-4xl space-y-4">
                {isInbox ? (
                  <>
                    <CaptureBar />
                    <InboxList categories={categories} />
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {NOTE_STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(status === s ? null : s)}
                          aria-pressed={status === s}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            status === s
                              ? 'border-transparent bg-secondary'
                              : 'border-border text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                      <Button size="sm" className="ml-auto h-8" onClick={() => setCreating(true)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Nova nota
                      </Button>
                    </div>

                    {notes.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                          <NotebookPen className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {q || status ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma nota com esses filtros.
                          </p>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Nada em {active} ainda</p>
                              <p className="text-sm text-muted-foreground">
                                Crie a primeira nota ou capture um link no Inbox pra estudar depois.
                              </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                              <Plus className="mr-1 h-3.5 w-3.5" /> Nova nota
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {notes.map((note) => (
                          <NoteCard key={note.path} note={note} onOpen={setOpenPath} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <NotePanel path={openPath} onNavigate={setOpenPath} onClose={() => setOpenPath(null)} />
      {!isInbox && (
        <NewNoteDialog
          open={creating}
          category={active}
          onClose={() => setCreating(false)}
          onCreated={setOpenPath}
        />
      )}
    </AppLayout>
  )
}
