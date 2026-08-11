import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import type { ModuleInfo, ModuleKey } from '@/types/api'

const MODULES = ['modules']

export function useModules() {
  return useQuery({
    queryKey: MODULES,
    queryFn: async () => (await api.get('/modules')).data.data as ModuleInfo[],
  })
}

// Set of enabled module keys, derived from the modules array.
export function enabledSet(modules: ModuleInfo[] | undefined): Set<ModuleKey> {
  return new Set((modules ?? []).filter((m) => m.enabled).map((m) => m.key))
}

// Convenience: returns { enabled: Set<key>, isEnabled(key), isLoading, ... }.
export function useEnabledModules() {
  const query = useModules()
  const enabled = enabledSet(query.data)
  return {
    ...query,
    enabled,
    isEnabled: (key: ModuleKey) => enabled.has(key),
  }
}

export function useToggleModule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, enabled }: { key: ModuleKey; enabled: boolean }) => {
      await csrf()
      return (await api.patch(`/modules/${key}`, { enabled })).data.data as ModuleInfo
    },
    // Otimista: reflete o toggle imediatamente na barra lateral; onSettled reconcilia.
    onMutate: async ({ key, enabled }) => {
      await qc.cancelQueries({ queryKey: MODULES })
      const prev = qc.getQueryData<ModuleInfo[]>(MODULES)
      qc.setQueryData<ModuleInfo[]>(MODULES, (old) =>
        (old ?? []).map((m) => (m.key === key ? { ...m, enabled } : m)),
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(MODULES, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: MODULES }),
  })
}
