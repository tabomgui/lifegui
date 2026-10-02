import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Copy, Smartphone, Trash2 } from 'lucide-react'
import { api, csrf } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFormat } from '@/i18n/format'
import { useEnabledModules } from '@/hooks/use-modules'

interface ApiToken {
  id: number
  name: string
  created_at: string | null
  last_used_at: string | null
}

export function CaptureSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const { dateTime, locale } = useFormat()
  const { isEnabled } = useEnabledModules()
  const enabled = isEnabled('brain')
  const qc = useQueryClient()
  const [name, setName] = useState<string | null>(null)
  // Token recém-criado: aparece uma única vez (o servidor guarda só o hash).
  const [fresh, setFresh] = useState<string | null>(null)

  const { data: tokens = [] } = useQuery({
    queryKey: ['tokens'],
    queryFn: async () => (await api.get('/tokens')).data.data as ApiToken[],
    enabled,
  })

  const create = useMutation({
    mutationFn: async (n: string) => {
      await csrf()
      return (await api.post('/tokens', { name: n })).data.data as { token: string }
    },
    onSuccess: (data) => {
      setFresh(data.token)
      qc.invalidateQueries({ queryKey: ['tokens'] })
    },
    onError: () => toast.error(t('capture.toast.createError')),
  })

  const revoke = useMutation({
    mutationFn: async (id: number) => {
      await csrf()
      await api.delete(`/tokens/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens'] })
      toast.success(t('capture.toast.revoked'))
    },
    onError: () => toast.error(t('capture.toast.revokeError')),
  })

  if (!enabled) return null

  async function copy() {
    if (!fresh) return
    try {
      await navigator.clipboard.writeText(fresh)
      toast.success(t('capture.toast.copied'))
    } catch {
      toast.error(t('capture.toast.copyError'))
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-sm font-semibold">{t('capture.title')}</div>
            <div className="text-sm text-muted-foreground">{t('capture.description')}</div>
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const value = (name ?? t('capture.defaultTokenName')).trim()
              if (value) create.mutate(value)
            }}
          >
            <Input
              value={name ?? t('capture.defaultTokenName')}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('capture.tokenNamePlaceholder')}
              aria-label={t('capture.tokenNamePlaceholder')}
              className="h-9"
            />
            <Button
              type="submit"
              size="sm"
              className="h-9"
              disabled={create.isPending || !(name ?? t('capture.defaultTokenName')).trim()}
            >
              {t('capture.generate')}
            </Button>
          </form>

          {fresh && (
            <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-xs font-medium">{t('capture.copyNowWarning')}</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded bg-muted px-2 py-1 text-xs">{fresh}</code>
                <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={copy}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> {t('common:actions.copy')}
                </Button>
              </div>
            </div>
          )}

          {tokens.length > 0 && (
            <div className="space-y-1.5">
              {tokens.map((tk) => (
                <div key={tk.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{tk.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tk.last_used_at
                        ? t('capture.lastUsed', {
                            date: dateTime(
                              tk.last_used_at,
                              locale === 'pt-BR' ? undefined : { dateStyle: 'medium', timeStyle: 'short' },
                            ),
                          })
                        : t('capture.neverUsed')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={t('capture.revoke', { name: tk.name })}
                    onClick={() => revoke.mutate(tk.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
