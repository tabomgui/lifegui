import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CircleAlert, CircleCheck, FolderCog } from 'lucide-react'
import { api } from '@/lib/api'
import { useEnabledModules } from '@/hooks/use-modules'

// Só leitura: a raiz vale pra instância inteira e vem do deploy (VAULTS_PATH).
interface VaultSettings {
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
  const { t } = useTranslation('settings')
  const { isEnabled } = useEnabledModules()
  const enabled = isEnabled('brain')
  const { data } = useVaultSettings(enabled)

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
