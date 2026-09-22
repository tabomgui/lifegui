import { useEffect, useRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

/**
 * Editor WYSIWYG markdown (Milkdown Crepe, estilo Notion/Typora): slash
 * commands, atalhos de markdown, toolbar de seleção. Lê e escreve markdown
 * puro — o corpo da nota vai pro vault como texto, sem formato proprietário.
 *
 * O conteúdo vive dentro do editor; o pai lê via getMarkdownRef na hora de
 * salvar (evita serializar a cada tecla).
 */
export function NoteEditor({ defaultValue, getMarkdownRef }: {
  defaultValue: string
  getMarkdownRef: { current: (() => string) | null }
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const crepe = new Crepe({ root, defaultValue })
    let alive = true

    crepe.create().then(() => {
      if (!alive) return
      getMarkdownRef.current = () => crepe.getMarkdown()
    })

    return () => {
      alive = false
      getMarkdownRef.current = null
      crepe.destroy()
    }
    // defaultValue intencionalmente fora das deps: o editor é dono do estado
    // após montar; recriar a cada render perderia cursor e histórico.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={rootRef} className="note-editor min-h-[50vh]" />
}
