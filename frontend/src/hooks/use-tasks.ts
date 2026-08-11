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
    mutationFn: async (text: string) => {
      await csrf()
      return (await api.post('/tasks/process', { text })).data.data as Task[]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// Move otimista: atualiza status/position no cache antes da resposta; reverte em erro.
export function useMoveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, position }: { id: number; status: TaskStatus; position: number }) => {
      await csrf()
      return (await api.patch(`/tasks/${id}`, { status, position })).data.data as Task
    },
    // Snapshot/rollback é por-mutação: sob moves concorrentes muito rápidos, um rollback
    // pode sobrescrever o patch otimista de outro move em curso. O onSettled (invalidate)
    // sempre reconcilia com o servidor logo em seguida, então a janela de inconsistência é curta.
    onMutate: async ({ id, status, position }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = qc.getQueryData<Task[]>(KEY)
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
