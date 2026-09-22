import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface GraphNode {
  id: string
  title: string
  category: string | null
  color: string | null
  degree: number
  ghost?: boolean
  tag?: boolean
  x?: number
  y?: number
}

interface GraphData {
  nodes: GraphNode[]
  links: { source: string; target: string; tag?: boolean }[]
}

function useBrainGraph() {
  return useQuery({
    queryKey: ['brain', 'graph'],
    queryFn: async () => (await api.get('/brain/graph')).data.data as GraphData,
  })
}

/**
 * Visão de grafo no estilo do Obsidian: notas são nós (cor da categoria,
 * tamanho pelo nº de conexões), wikilinks são arestas; alvo inexistente
 * aparece como nó fantasma apagado. Clique abre a nota.
 */
export function GraphView({ onOpenNote, onCreateNote }: {
  onOpenNote: (path: string) => void
  onCreateNote: (title: string) => void
}) {
  const { data } = useBrainGraph()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState<string | null>(null)
  const [showTags, setShowTags] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // A lib muta os objetos (posições da simulação): entrega uma cópia.
  // Tags entram só com o toggle ligado.
  const graphData = useMemo(
    () => ({
      nodes: (data?.nodes ?? []).filter((n) => showTags || !n.tag).map((n) => ({ ...n })),
      links: (data?.links ?? []).filter((l) => showTags || !l.tag).map((l) => ({ ...l })),
    }),
    [data, showTags],
  )

  const dark = document.documentElement.classList.contains('dark')
  const labelColor = dark ? 'rgba(230,230,230,0.85)' : 'rgba(40,40,40,0.85)'
  const ghostColor = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'
  const linkColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'

  if (data && data.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Sem notas ainda — o grafo nasce quando suas notas começarem a se ligar com [[links]].
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <button
        type="button"
        onClick={() => setShowTags((t) => !t)}
        aria-pressed={showTags}
        className={`absolute right-3 top-3 z-10 rounded-md border px-2 py-1 text-xs font-medium ${
          showTags ? 'bg-secondary text-foreground' : 'bg-card text-muted-foreground hover:bg-accent'
        }`}
      >
        # Tags
      </button>
      {size.w > 0 && (
        <ForceGraph2D
          width={size.w}
          height={size.h}
          graphData={graphData}
          nodeId="id"
          linkColor={() => linkColor}
          linkWidth={1}
          nodeRelSize={4}
          onNodeClick={(node) => {
            const n = node as GraphNode
            if (n.ghost) onCreateNote(n.title)
            else if (!n.tag) onOpenNote(n.id)
          }}
          onNodeHover={(node) => setHover((node as GraphNode | null)?.id ?? null)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode
            const r = n.tag ? 2.5 : 3 + Math.min(6, n.degree)
            ctx.beginPath()
            ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI)
            if (n.tag) {
              // Tag: círculo vazado, neutro — conecta sem competir com as notas.
              ctx.strokeStyle = labelColor
              ctx.lineWidth = 1 / globalScale
              ctx.stroke()
            } else {
              ctx.fillStyle = n.ghost ? ghostColor : (n.color ?? '#64748b')
              ctx.fill()
            }
            if (hover === n.id) {
              ctx.strokeStyle = labelColor
              ctx.lineWidth = 1.5 / globalScale
              ctx.stroke()
            }

            // Rótulo aparece com zoom suficiente ou no hover (igual Obsidian).
            if (globalScale > 1.2 || hover === n.id) {
              const fontSize = Math.max(10 / globalScale, 2.5)
              ctx.font = `${fontSize}px sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'top'
              ctx.fillStyle = n.ghost ? ghostColor : labelColor
              ctx.fillText(n.title, n.x ?? 0, (n.y ?? 0) + r + 1.5)
            }
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNode
            const r = 3 + Math.min(6, n.degree)
            ctx.beginPath()
            ctx.arc(n.x ?? 0, n.y ?? 0, r + 2, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.fill()
          }}
        />
      )}
    </div>
  )
}
