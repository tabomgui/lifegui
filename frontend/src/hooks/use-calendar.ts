import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, csrf } from '@/lib/api'
import type { CalendarEvent, CalendarLinkType } from '@/types/api'

// Prefixo comum: invalidar ['calendar'] revalida agenda + vinculados.
const CALENDAR = ['calendar']

export function useCalendarStatus() {
  return useQuery({
    queryKey: ['calendar', 'status'],
    queryFn: async () =>
      (await api.get('/calendar/status')).data.data as { connected: boolean; connected_at: string | null },
  })
}

export function useCalendarEvents(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['calendar', 'events', from, to],
    queryFn: async () =>
      (await api.get('/calendar/events', { params: { from, to } })).data.data as CalendarEvent[],
    enabled,
    // Leitura ao vivo do Google: staleTime curto dá a "mão dupla" sem webhook.
    staleTime: 60_000,
    retry: (count, error) => {
      // 409 = não conectado; repetir não muda nada.
      const status = (error as { response?: { status?: number } }).response?.status
      return status !== 409 && count < 2
    },
  })
}

export function useLinkedEvents(type: CalendarLinkType, ref: string | number, enabled = true) {
  return useQuery({
    queryKey: ['calendar', 'linked', type, String(ref)],
    queryFn: async () =>
      (await api.get('/calendar/events/linked', { params: { type, ref } })).data.data as CalendarEvent[],
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}

export interface SchedulePayload {
  type: CalendarLinkType
  ref: string
  title: string
  start: string
  duration_minutes?: number
  rrule?: string
  timezone?: string
}

export function useScheduleEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SchedulePayload) => {
      await csrf()
      return (await api.post('/calendar/events', payload)).data.data as CalendarEvent
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CALENDAR }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; start?: string; end?: string; rrule?: string | null; timezone?: string }) => {
      await csrf()
      return (await api.patch(`/calendar/events/${encodeURIComponent(id)}`, patch)).data.data as CalendarEvent
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CALENDAR }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await csrf()
      await api.delete(`/calendar/events/${encodeURIComponent(id)}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CALENDAR }),
  })
}

export function useDisconnectCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await csrf()
      await api.delete('/calendar/connection')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CALENDAR }),
  })
}

/** Timezone do browser — vai no evento pro Google (obrigatório em recorrentes). */
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
