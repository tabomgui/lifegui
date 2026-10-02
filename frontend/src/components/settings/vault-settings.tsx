import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CircleAlert, CircleCheck, FolderCog } from 'lucide-react'
import { api, csrf } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEnabledModules } from '@/hooks/use-modules'

interface VaultSettings {
  vaults_path: string | null
  effective: string
  exists: boolean
  user_vault: string
  initialized: boolean
}

function useVaultSettings(enabled: boolean) {
  return useQuery({
    queryKey: ['settings', 'vault'],
    queryFn: async () => (await api.get('/settings/vault')).data.data as VaultSettings,
    enabled,
  })
}

export function VaultSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const { isEnabled } = useEnabledModules()
  const enabled = isEnabled('brain')
  const { data } = useVaultSettings(enabled)
  const qc = useQueryClient()
  const [path, setPath] = useState('')

  useEffect(() => {
    if (data) setPath(data.vaults_path ?? '')
  }, [data])

  const save = useMutation({
    mutationFn: async (vaults_path: string) => {
      await csrf()
      return (await api.patch('/settings/vault', { vaults_path: vaults_path || null })).data
        .data as VaultSettings
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'vault'] })
      qc.invalidateQueries({ queryKey: ['brain'] })
      toast.success(t('vault.toast.saved'))
    },
    onError: () => toast.error(t('vault.toast.invalidPath')),
  })

  if (!enabled) return null

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          <FolderCog className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-sm font-semibold">{t('vault.title')}</div>
            <div className="text-sm text-muted-foreground">
              {t('vault.description')}{' '}
              (<code className="rounded bg-muted px-1 text-xs">{t('vault.pathPattern')}</code>).{' '}
              {t('vault.scopeNote')}
            </div>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); save.mutate(path.trim()) }}
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="vaults-path" className="sr-only">{t('vault.pathLabel')}</Label>
              <Input
                id="vaults-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder={data ? t('vault.pathDefault', { path: data.effective }) : t('vault.pathExample')}
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit" size="sm" className="h-9" disabled={save.isPending}>
              {t('common:actions.save')}
            </Button>
          </form>
          {data && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {data.initialized ? (
                <>
                  <CircleCheck className="h-3.5 w-3.5 text-emerald-500" />
                  {t('vault.yourVault')} <code className="rounded bg-muted px-1">{data.user_vault}</code>
                </>
              ) : (
                <>
                  <CircleAlert className="h-3.5 w-3.5 text-amber-500" />
                  {data.exists
                    ? (
                      <>
                        {t('vault.rootExistsPrefix')}
                        <code className="rounded bg-muted px-1">{data.user_vault}</code>
                        {t('vault.rootExistsSuffix')}
                      </>
                    )
                    : (
                      <>
                        {t('vault.rootMissingPrefix')}{' '}
                        <code className="rounded bg-muted px-1">{data.effective}</code>{' '}
                        {t('vault.rootMissingSuffix')}
                      </>
                    )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
