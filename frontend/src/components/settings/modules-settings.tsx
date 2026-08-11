import { toast } from 'sonner'
import { useModules, useToggleModule } from '@/hooks/use-modules'
import { DynamicIcon } from '@/components/icon'
import { Switch } from '@/components/ui/switch'
import type { ModuleInfo } from '@/types/api'

function versionLabel(version: string) {
  return version.startsWith('v') ? version : `v${version}`
}

function ModuleRow({ module }: { module: ModuleInfo }) {
  const toggle = useToggleModule()
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          <DynamicIcon name={module.icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{module.label}</div>
          <div className="text-sm text-muted-foreground">{module.description}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {versionLabel(module.version)}
        </span>
        <Switch
          checked={module.enabled}
          disabled={toggle.isPending}
          aria-label={`Ativar ${module.label}`}
          onCheckedChange={(enabled) =>
            toggle.mutate(
              { key: module.key, enabled },
              {
                onError: () =>
                  toast.error(`Não foi possível ${enabled ? 'ativar' : 'desativar'} ${module.label}.`),
              },
            )
          }
        />
      </div>
    </div>
  )
}

export function ModulesSettings() {
  const { data: modules = [], isLoading, isError } = useModules()

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Ative quais módulos aparecem na barra lateral.</p>
      {isError ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar os módulos.
        </div>
      ) : isLoading ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="space-y-3">
          {modules.map((module) => (
            <ModuleRow key={module.key} module={module} />
          ))}
        </div>
      )}
    </div>
  )
}
