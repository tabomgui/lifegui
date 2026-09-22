import { useState } from 'react'
import { FolderOpen, Plus, Search } from 'lucide-react'
import { AppLayout } from '@/components/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NoteCard } from '@/components/brain/note-card'
import { NotePanel } from '@/components/brain/note-panel'
import { NewNoteDialog } from '@/components/brain/new-note-dialog'
import { CaptureBar, InboxList } from '@/components/brain/inbox'
import { NOTE_STATUSES, STATUS_LABEL } from '@/components/brain/status'
import { useBrainCategories, useBrainInbox, useBrainNotes } from '@/hooks/use-brain'
import type { NoteStatus } from '@/types/api'

const INBOX_TAB = '__inbox__'

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

  return (
    <AppLayout title="Cérebro">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : !initialized ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Vault não encontrado</p>
              <p className="max-w-md text-sm text-muted-foreground">
                O módulo Cérebro gerencia um vault Obsidian no servidor. Crie a pasta do seu
                vault em <code className="rounded bg-muted px-1">VAULTS_PATH/&#123;seu id&#125;</code> com
                as pastas de categoria e recarregue.
              </p>
            </div>
          ) : (
            <>
              <Tabs value={active} onValueChange={(v) => { setTab(v); setStatus(null); setQ('') }}>
                <TabsList className="w-full justify-start overflow-x-auto">
                  {categories.map((c) => (
                    <TabsTrigger key={c.name} value={c.name}>
                      {c.name}
                      <span className="ml-1.5 text-xs text-muted-foreground">{c.total}</span>
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value={INBOX_TAB}>
                    Inbox
                    {inboxCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-xs">{inboxCount}</span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {isInbox ? (
                <div className="space-y-4">
                  <CaptureBar />
                  <InboxList categories={categories} />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-40 flex-1">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar notas…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="h-8 pl-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-1">
                      {NOTE_STATUSES.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={status === s ? 'default' : 'outline'}
                          className="h-8 text-xs"
                          onClick={() => setStatus(status === s ? null : s)}
                        >
                          {STATUS_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                    <Button size="sm" className="h-8" onClick={() => setCreating(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Nova nota
                    </Button>
                  </div>

                  {notes.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      {q || status ? 'Nenhuma nota com esses filtros.' : 'Nenhuma nota nesta categoria ainda.'}
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
            </>
          )}
        </div>
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
