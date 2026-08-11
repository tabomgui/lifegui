import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import type { Subtask, Task, TaskStatus } from '@/types/api'

const KEY = ['tasks']

export function useTasks() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get('/tasks')).data.data as Task[],
  })
}

export function useTaskDetail(id: number | null) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => (await api.get(`/tasks/${id}`)).data.data as Task,
    enabled: id != null,
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...fields
    }: { id: number } & Partial<Pick<Task, 'title' | 'notes' | 'due_date' | 'category_id' | 'status'>>) => {
      await csrf()
      return (await api.patch(`/tasks/${id}`, fields)).data.data as Task
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['task', id] })
    },
  })
}

export function useAddSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: number; title: string }) => {
      await csrf()
      return (await api.post(`/tasks/${taskId}/subtasks`, { title })).data.data as Subtask
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['task', taskId] })
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

export function useUpdateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      subtaskId,
      ...fields
    }: { taskId: number; subtaskId: number } & Partial<Pick<Subtask, 'done' | 'title'>>) => {
      await csrf()
      return (await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, fields)).data.data as Subtask
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['task', taskId] })
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, subtaskId }: { taskId: number; subtaskId: number }) => {
      await csrf()
      await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`)
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['task', taskId] })
      qc.invalidateQueries({ queryKey: KEY })
    },
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

export function useUpdateTaskDueDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, due_date }: { id: number; due_date: string | null }) => {
      await csrf()
      return (await api.patch(`/tasks/${id}`, { due_date })).data.data as Task
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
