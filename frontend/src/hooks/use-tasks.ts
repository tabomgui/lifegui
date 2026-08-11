import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import type { Task, TaskStatus } from '@/types/api'

const KEY = ['tasks']

export function useTasks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/tasks')).data.data as Task[],
  })
}

export function useProcessTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ text, categoryId }: { text: string; categoryId?: number | null }) => {
      await csrf()
      return (await api.post('/tasks/process', { text, category_id: categoryId ?? null })).data.data as Task[]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// Move otimista: atualiza status/position no cache antes da resposta; reverte em erro.
// Position é global-por-status (não escopada por categoria), então é sempre computada a
// partir da lista COMPLETA em cache (não da lista filtrada que o caller possa ter) — isso
// garante que drag e botões de transição apendem no fim real da coluna, em qualquer aba.
export function useMoveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TaskStatus }) => {
      await csrf()
      const all = qc.getQueryData<Task[]>(KEY) ?? []
      const position = all.filter((t) => t.status === status && t.id !== id).length
      return (await api.patch(`/tasks/${id}`, { status, position })).data.data as Task
    },
    // Snapshot/rollback é por-mutação: sob moves concorrentes muito rápidos, um rollback
    // pode sobrescrever o patch otimista de outro move em curso. O onSettled (invalidate)
    // sempre reconcilia com o servidor logo em seguida, então a janela de inconsistência é curta.
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = qc.getQueryData<Task[]>(KEY)
      const all = prev ?? []
      const position = all.filter((t) => t.status === status && t.id !== id).length
      qc.setQueryData<Task[]>(KEY, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, status, position } : t)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateTaskCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, category_id }: { id: number; category_id: number | null }) => {
      await csrf()
      return (await api.patch(`/tasks/${id}`, { category_id })).data.data as Task
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await csrf()
      await api.delete(`/tasks/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
