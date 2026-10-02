import { Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { STATUS_BADGE, STATUS_LABEL_KEY } from '@/components/brain/status'
import type { BrainNoteSummary } from '@/types/api'

export function NoteCard({ note, onOpen }: { note: BrainNoteSummary; onOpen: (path: string) => void }) {
  const { t } = useTranslation('brain')
  return (
    <button
      type="button"
      onClick={() => onOpen(note.path)}
      className="flex w-full flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition-colors hover:border-ring/40 hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{note.title}</span>
        {note.status && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[note.status]}`}>
            {t(STATUS_LABEL_KEY[note.status])}
          </span>
        )}
      </div>
      {note.resumo && <p className="line-clamp-2 text-xs text-muted-foreground">{note.resumo}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {note.fonte && <Link2 className="h-3 w-3 text-muted-foreground" />}
        {note.tags.map((tag) => (
          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {tag}
          </span>
        ))}
        {note.data_salvo && (
          <span className="ml-auto text-[11px] text-muted-foreground/70">{note.data_salvo}</span>
        )}
      </div>
    </button>
  )
}
