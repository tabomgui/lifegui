import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface SetupStatus {
  needs_setup: boolean
  registration_enabled: boolean
  google_login_enabled: boolean
}

export const SETUP_STATUS_KEY = ['setup', 'status']

// Estado público da instância: decide entre /setup, login e cadastro.
export function useSetupStatus() {
  return useQuery({
    queryKey: SETUP_STATUS_KEY,
    queryFn: async () => (await api.get('/setup/status')).data.data as SetupStatus,
    staleTime: 60_000,
  })
}
