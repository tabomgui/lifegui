import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import type {
  BrainCategory,
  BrainNote,
  BrainNoteSummary,
  InboxItem,
  NoteLink,
  NoteStatus,
} from '@/types/api'

// Prefixo comum: invalidar ['brain'] revalida tudo do módulo por prefix-matching.
const BRAIN = ['brain']

interface CategoriesResponse {
  data: BrainCategory[]
  initialized: boolean
}

export function useBrainCategories(enabled = true) {
  return useQuery({
    queryKey: ['brain', 'categories'],
    queryFn: async () => (await api.get('/brain/categories')).data as CategoriesResponse,
    enabled,
  })
}

export function useCreateBrainCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; icon?: string; color?: string }) => {
      await csrf()
      return (await api.post('/brain/categories', input)).data.data as BrainCategory
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BRAIN }),
  })
}

export function useUpdateBrainCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ current, ...input }: { current: string; name?: string; icon?: string; color?: string }) => {
      await csrf()
      return (await api.patch(`/brain/categories/${encodeURIComponent(current)}`, input)).data
        .data as Pick<BrainCategory, 'name' | 'icon' | 'color'>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BRAIN }),
  })
}

export function useReorderBrainCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (order: string[]) => {
      await csrf()
      return (await api.patch('/brain/categories/reorder', { order })).data.data as string[]
    },
    // Otimista: reflete a nova ordem nas abas imediatamente; onSettled reconcilia.
    onMutate: async (order) => {
      await qc.cancelQueries({ queryKey: ['brain', 'categories'] })
      const prev = qc.getQueryData<CategoriesResponse>(['brain', 'categories'])
      if (prev) {
        const byName = new Map(prev.data.map((c) => [c.name, c]))
        qc.setQueryData<CategoriesResponse>(['brain', 'categories'], {
          ...prev,
          data: [
            ...order.map((n) => byName.get(n)).filter((c): c is BrainCategory => c !== undefined),
            ...prev.data.filter((c) => !order.includes(c.name)),
          ],
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['brain', 'categories'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: BRAIN }),
  })
}

export function useDeleteBrainCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      await csrf()
      await api.delete(`/brain/categories/${encodeURIComponent(name)}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BRAIN }),
  })
}

export function useBrainNotes(params: { category?: string; status?: NoteStatus | null; q?: string } = {}) {
  const { category, status, q } = params
  return useQuery({
    queryKey: ['brain', 'notes', category ?? null, status ?? null, q ?? ''],
    queryFn: async () =>
      (
        await api.get('/brain/notes', {
          params: {
            ...(category ? { category } : {}),
            ...(status ? { status } : {}),
            ...(q ? { q } : {}),
          },
        })
      ).data.data as BrainNoteSummary[],
  })
}

export function useBrainNote(path: string | null) {
  return useQuery({
    queryKey: ['brain', 'note', path],
    queryFn: async () => (await api.get(`/brain/notes/${path}`)).data.data as BrainNote,
    enabled: path !== null,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      category: string
      title: string
      fonte?: string
      resumo?: string
      tags?: string[]
      body?: string
    }) => {
      await csrf()
      return (await api.post('/brain/notes', input)).data.data as BrainNote
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BRAIN }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      path,
      ...input
    }: {
      path: string
      body?: string
      frontmatter?: Record<string, unknown>
    }) => {
      await csrf()
      return (await api.patch(`/brain/notes/${path}`, input)).data.data as BrainNote
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BRAIN }),
  })
}

interface InboxResponse {
  data: InboxItem[]
  initialized: boolean
}

export function useBrainInbox(enabled = true) {
  return useQuery({
    queryKey: ['brain', 'inbox'],
    queryFn: async () => (await api.get('/brain/inbox')).data as InboxResponse,
    enabled,
  })
}

export function useCaptureInbox() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { content: string; title?: string }) => {
      await csrf()
      return (await api.post('/brain/inbox', input)).data.data as { path: string; title: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BRAIN }),
  })
}

export function usePromoteInbox() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      path,
      ...input
    }: {
      path: string
      category: string
      title: string
      resumo?: string
      tags?: string[]
    }) => {
      await csrf()
      return (await api.post(`/brain/inbox/${path}/promote`, input)).data.data as BrainNote
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BRAIN }),
  })
}

export function useCreateNoteLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { type: 'task' | 'habit'; id: number; note_path: string }) => {
      await csrf()
      return (await api.post('/brain/links', input)).data.data as NoteLink
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRAIN })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
      qc.invalidateQueries({ queryKey: ['habits'] })
    },
  })
}

export function useDeleteNoteLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await csrf()
      await api.delete(`/brain/links/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRAIN })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
      qc.invalidateQueries({ queryKey: ['habits'] })
    },
  })
}

export function useBrainTags(enabled = true) {
  return useQuery({
    queryKey: ['brain', 'tags'],
    queryFn: async () => (await api.get('/brain/tags')).data.data as string[],
    enabled,
  })
}
