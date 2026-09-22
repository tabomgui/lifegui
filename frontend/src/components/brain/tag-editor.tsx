import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { useBrainTags, useUpdateNote } from '@/hooks/use-brain'

/**
 * Tags da nota, editáveis inline: chip com X remove; "+ Tag" abre input com
 * autocomplete das tags já usadas no vault — digitou uma nova, cria. Cada
 * mudança salva na hora (frontmatter.tags), igual ao pill de status.
 */
export function TagEditor({ path, tags }: { path: string; tags: string[] }) {
  const { data: allTags = [] } = useBrainTags()
  const update = useUpdateNote()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAdding(false)
    setQuery('')
  }, [path])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  async function save(next: string[]) {
    try {
      await update.mutateAsync({ path, frontmatter: { tags: next } })
    } catch {
      toast.error('Não foi possível salvar as tags')
    }
  }

  function add(tag: string) {
    const clean = tag.trim().replace(/^#/, '')
    if (!clean) return
    setQuery('')
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return
    save([...tags, clean])
  }

  const q = query.trim().toLowerCase()
  const suggestions = allTags
    .filter((t) => !tags.some((mine) => mine.toLowerCase() === t.toLowerCase()))
    .filter((t) => q === '' || t.toLowerCase().includes(q))
    .slice(0, 8)
  const isNew = q !== '' && !allTags.some((t) => t.toLowerCase() === q)

  return (
    <>
      {tags.map((tag) => (
        <span
          key={tag}
          className="group inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remover tag ${tag}`}
            className="ml-0.5 rounded p-0.5 opacity-50 hover:bg-accent hover:text-foreground hover:opacity-100"
            onClick={() => save(tags.filter((t) => t !== tag))}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {adding ? (
        <span className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add(query)
              } else if (e.key === 'Escape') {
                setAdding(false)
                setQuery('')
              }
            }}
            onBlur={() => setTimeout(() => { setAdding(false); setQuery('') }, 150)}
            placeholder="tag…"
            className="h-5 w-24 rounded border border-input bg-transparent px-1.5 text-[11px] outline-none focus-visible:border-ring"
          />
          {(suggestions.length > 0 || isNew) && (
            <div className="absolute left-0 top-6 z-50 max-h-44 w-44 overflow-auto rounded-md border bg-popover p-1 shadow-md">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  // mousedown pra ganhar do blur do input.
                  onMouseDown={(e) => { e.preventDefault(); add(tag) }}
                  className="block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-accent"
                >
                  {tag}
                </button>
              ))}
              {isNew && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); add(query) }}
                  className="block w-full truncate rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
                >
                  Criar “{query.trim()}”
                </button>
              )}
            </div>
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-0.5 rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-2.5 w-2.5" /> Tag
        </button>
      )}
    </>
  )
}
