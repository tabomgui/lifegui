import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import type { Category } from '@/types/api'

const KEY = ['categories']

export function useCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/categories')).data.data as Category[],
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<Category, 'name' | 'color' | 'icon'>) => {
      await csrf()
      return (await api.post('/categories', input)).data.data as Category
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Pick<Category, 'name' | 'color' | 'icon'>> & { id: number }) => {
      await csrf()
      return (await api.patch(`/categories/${id}`, input)).data.data as Category
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    // `ids` é a lista COMPLETA na nova ordem; o backend grava position = índice.
    mutationFn: async (ids: number[]) => {
      await csrf()
      await api.patch('/categories/reorder', { ids })
    },
    // Otimista: reordena o cache na hora pra aba não "pular" esperando o request.
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = qc.getQueryData<Category[]>(KEY)
      if (prev) {
        const byId = new Map(prev.map((c) => [c.id, c]))
        const next = ids.map((id) => byId.get(id)).filter((c): c is Category => !!c)
        qc.setQueryData(KEY, next)
      }
      return { prev }
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await csrf()
      await api.delete(`/categories/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
