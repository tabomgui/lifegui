import { useEffect, useRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx } from '@milkdown/kit/core'
import { SlashProvider, slashFactory } from '@milkdown/kit/plugin/slash'
import type { EditorView } from '@milkdown/prose/view'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

export interface NoteEditorApi {
  getMarkdown: () => string
  /** Texto plano da seleção atual (vazio se nada selecionado). */
  getSelectionText: () => string
  /** Substitui a seleção atual por texto plano (ex.: [[wikilink]]). */
  replaceSelection: (text: string) => void
}

const wikilinkSlash = slashFactory('WIKILINK')

/**
 * Autocomplete de [[wikilinks]]: digitou "[[", lista as notas existentes
 * filtrando pelo que vier depois; escolher insere "Título]]" fechando o link.
 */
function makeWikilinkProvider(titles: () => string[]) {
  const content = document.createElement('div')
  content.className =
    'z-50 max-h-48 w-64 overflow-auto rounded-md border bg-popover p-1 shadow-md'

  let currentView: EditorView | null = null
  let query = ''

  const provider = new SlashProvider({
    content,
    shouldShow(view) {
      const text = provider.getContent(view)
      if (text === undefined) return false
      const match = /\[\[([^\[\]]*)$/.exec(text)
      if (!match) return false
      query = match[1]
      currentView = view
      render()
      return true
    },
  })

  function pick(title: string) {
    const view = currentView
    if (!view) return
    const { from } = view.state.selection
    view.dispatch(
      view.state.tr.insertText(`${title}]]`, from - query.length, from),
    )
    provider.hide()
    view.focus()
  }

  function render() {
    const q = query.toLowerCase()
    const options = titles()
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 8)

    content.replaceChildren(
      ...options.map((title) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = title
        btn.className =
          'block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
        // mousedown pra ganhar do blur do editor.
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault()
          pick(title)
        })
        return btn
      }),
    )

    if (options.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'Nenhuma nota com esse título'
      empty.className = 'px-2 py-1.5 text-sm text-muted-foreground'
      content.replaceChildren(empty)
    }
  }

  return provider
}

/**
 * Editor WYSIWYG markdown (Milkdown Crepe, estilo Notion/Typora): slash
 * commands, atalhos de markdown, toolbar de seleção, autocomplete de
 * [[wikilinks]]. Lê e escreve markdown puro — o corpo vai pro vault como
 * texto, sem formato proprietário.
 */
export function NoteEditor({ defaultValue, apiRef, noteTitles = [] }: {
  defaultValue: string
  apiRef: { current: NoteEditorApi | null }
  noteTitles?: string[]
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const titlesRef = useRef(noteTitles)
  titlesRef.current = noteTitles

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const crepe = new Crepe({ root, defaultValue })
    const provider = makeWikilinkProvider(() => titlesRef.current)

    crepe.editor
      .config((ctx) => {
        ctx.set(wikilinkSlash.key, {
          view: () => ({
            update: (view, prevState) => provider.update(view, prevState),
            destroy: () => {},
          }),
        })
      })
      .use(wikilinkSlash)

    let alive = true

    crepe.create().then(() => {
      if (!alive) return
      apiRef.current = {
        getMarkdown: () => crepe.getMarkdown(),
        getSelectionText: () => {
          let text = ''
          crepe.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx)
            const { from, to } = view.state.selection
            text = view.state.doc.textBetween(from, to, '\n')
          })
          return text
        },
        replaceSelection: (text: string) => {
          crepe.editor.action((ctx) => {
            const view = ctx.get(editorViewCtx)
            view.dispatch(view.state.tr.insertText(text))
          })
        },
      }
    })

    return () => {
      alive = false
      apiRef.current = null
      provider.destroy()
      crepe.destroy()
    }
    // defaultValue intencionalmente fora das deps: o editor é dono do estado
    // após montar; recriar a cada render perderia cursor e histórico.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={rootRef} className="note-editor min-h-[50vh]" />
}
