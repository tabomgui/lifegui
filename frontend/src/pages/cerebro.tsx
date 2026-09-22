import { useState } from 'react'
import { FolderOpen, NotebookPen, Plus } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { NoteCard } from '@/components/brain/note-card'
import { NotePanel } from '@/components/brain/note-panel'
import { NewNoteDialog } from '@/components/brain/new-note-dialog'
import { CaptureBar, InboxList } from '@/components/brain/inbox'
import { BrainCategoryTabs, INBOX_TAB } from '@/components/brain/category-tabs'
import { GraphView } from '@/components/brain/graph-view'
import { NOTE_STATUSES, STATUS_DOT, STATUS_LABEL } from '@/components/brain/status'
import { useBrainCategories, useBrainInbox, useBrainNotes } from '@/hooks/use-brain'
import type { NoteStatus } from '@/types/api'

export default function Cerebro() {
  const { data: categoriesData, isLoading } = useBrainCategories()
  const categories = categoriesData?.data ?? []
  const initialized = categoriesData?.initialized ?? true
  const { data: inboxData } = useBrainInbox(initialized)
  const inboxCount = inboxData?.data.length ?? 0

  const [tab, setTab] = useState<string | null>(null)
  // Aba ativa precisa existir (renomear/apagar categoria invalida a seleção).
  const active =
    tab !== null && (tab === INBOX_TAB || categories.some((c) => c.name === tab))
      ? tab
      : categories[0]?.name ?? INBOX_TAB

  const [status, setStatus] = useState<NoteStatus | null>(null)
  const [q, setQ] = useState('')
  const [openPath, setOpenPath] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [graphMode, setGraphMode] = useState(false)

  const isInbox = active === INBOX_TAB
  const { data: notes = [] } = useBrainNotes(
    isInbox ? {} : { category: active, status, q: q || undefined },
  )

  function switchTab(next: string) {
    setTab(next)
    setStatus(null)
    setQ('')
  }

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
            <BrainCategoryTabs
              categories={categories}
              active={active}
              inboxCount={inboxCount}
              onChange={(tab) => { setGraphMode(false); switchTab(tab) }}
              search={q}
              onSearchChange={setQ}
              graphMode={graphMode}
              onToggleGraph={() => setGraphMode((g) => !g)}
            />

            {graphMode ? (
              <div className="min-h-0 flex-1">
                <GraphView onOpenNote={setOpenPath} />
              </div>
            ) : (
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
            )}
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
