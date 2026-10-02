import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useModules, useToggleModule } from '@/hooks/use-modules'
import { useInitVault } from '@/hooks/use-brain'
import { DynamicIcon } from '@/components/icon'
import { Switch } from '@/components/ui/switch'
import { StepHeader } from '@/components/onboarding/step-header'
import type { ModuleInfo } from '@/types/api'

export function ModulesStep() {
  const { t } = useTranslation(['onboarding', 'common'])
  const { data: modules = [], isLoading, isError } = useModules()
  const toggle = useToggleModule()
  const initVault = useInitVault()

  async function onToggle(module: ModuleInfo, enabled: boolean) {
    try {
      await toggle.mutateAsync({ key: module.key, enabled })
    } catch {
      toast.error(t(enabled ? 'modules.enableError' : 'modules.disableError', { label: module.label }))
      return
    }
    // O Cérebro precisa do vault criado no servidor; o init é idempotente.
    if (module.key === 'brain' && enabled) {
      try {
        await initVault.mutateAsync()
      } catch {
        toast.error(t('modules.vaultError'))
      }
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader title={t('modules.title')} description={t('modules.description')} />
      {isError ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {t('modules.loadError')}
        </div>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common:states.loading')}</p>
      ) : (
        <div className="space-y-2">
          {modules.map((m) => (
            <div key={m.key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <DynamicIcon name={m.icon} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-sm text-muted-foreground">{m.description}</div>
                </div>
              </div>
              <Switch
                checked={m.enabled}
                disabled={toggle.isPending || initVault.isPending}
                onCheckedChange={(v) => onToggle(m, v)}
                aria-label={t('modules.toggleLabel', { label: m.label })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
