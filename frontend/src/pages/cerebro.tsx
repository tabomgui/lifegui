import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Brain, Check, ChevronDown, Hash, NotebookPen, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { NoteCard } from '@/components/brain/note-card'
import { NotePanel } from '@/components/brain/note-panel'
import { NewNoteDialog } from '@/components/brain/new-note-dialog'
import { CaptureBar, InboxList } from '@/components/brain/inbox'
import { BrainCategoryTabs, INBOX_TAB } from '@/components/brain/category-tabs'
import { GraphView } from '@/components/brain/graph-view'
import { NOTE_STATUSES, STATUS_DOT, STATUS_LABEL_KEY } from '@/components/brain/status'
import { useBrainCategories, useBrainInbox, useBrainNotes, useInitVault } from '@/hooks/use-brain'
import { useFormat } from '@/i18n/format'
import type { NoteStatus } from '@/types/api'

// Vault ainda não existe: um clique cria a estrutura no servidor (zero touch).
function ActivateBrain() {
  const { t } = useTranslation('brain')
  const init = useInitVault()

  async function activate() {
    try {
      await init.mutateAsync()
      toast.success(t('activate.success'))
    } catch {
      toast.error(t('activate.error'))
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Brain className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('activate.heading')}</p>
          <p className="text-sm text-muted-foreground">
            {t('activate.description')}
          </p>
        </div>
        <Button onClick={activate} disabled={init.isPending}>
          <Brain className="mr-1.5 h-4 w-4" /> {t('activate.button')}
        </Button>
      </div>
    </div>
  )
}

export default function Cerebro() {
  const { t } = useTranslation(['brain', 'common'])
  const { compare } = useFormat()
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
  // Criar nota a partir de um nó fantasma clicado no grafo.
  const [ghostCreate, setGhostCreate] = useState<string | null>(null)

  const isInbox = active === INBOX_TAB
  const { data: notes = [] } = useBrainNotes(
    isInbox ? {} : { category: active, status, q: q || undefined },
  )

  // Subfiltro por tag: chips derivados das notas visíveis da categoria.
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const categoryTags = [...new Set(notes.flatMap((n) => n.tags))].sort(compare)
  const visibleNotes = tagFilter ? notes.filter((n) => n.tags.includes(tagFilter)) : notes

  function switchTab(next: string) {
    setTab(next)
    setStatus(null)
    setQ('')
    setTagFilter(null)
  }

  return (
    <AppLayout title={t('common:nav.brain')}>
      <main className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {t('common:states.loading')}
          </div>
        ) : !initialized ? (
          <ActivateBrain />
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
                <GraphView onOpenNote={setOpenPath} onCreateNote={setGhostCreate} />
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
                          {t(STATUS_LABEL_KEY[s])}
                        </button>
                      ))}
                      {categoryTags.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-pressed={tagFilter !== null}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                                tagFilter
                                  ? 'border-transparent bg-secondary'
                                  : 'border-border text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              <Hash className="h-3 w-3" />
                              {tagFilter ?? t('brain:filters.tagsLabel')}
                              <ChevronDown className="h-3 w-3 opacity-60" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
                            {tagFilter && (
                              <>
                                <DropdownMenuItem onClick={() => setTagFilter(null)}>
                                  {t('brain:filters.clearFilter')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {categoryTags.map((tag) => (
                              <DropdownMenuItem
                                key={tag}
                                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                              >
                                <Hash className="h-3 w-3" /> {tag}
                                {tagFilter === tag && <Check className="ml-auto h-3.5 w-3.5" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button size="sm" className="ml-auto h-8" onClick={() => setCreating(true)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> {t('brain:newNoteButton')}
                      </Button>
                    </div>

                    {visibleNotes.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                          <NotebookPen className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {q || status || tagFilter ? (
                          <p className="text-sm text-muted-foreground">
                            {t('brain:empty.noResults')}
                          </p>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{t('brain:empty.categoryEmpty', { category: active })}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('brain:empty.categoryEmptyHint')}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                              <Plus className="mr-1 h-3.5 w-3.5" /> {t('brain:newNoteButton')}
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {visibleNotes.map((note) => (
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
      <NewNoteDialog
        open={ghostCreate !== null}
        initialTitle={ghostCreate ?? undefined}
        onClose={() => setGhostCreate(null)}
        onCreated={(p) => { setGhostCreate(null); setOpenPath(p) }}
      />
    </AppLayout>
  )
}
