import { AppLayout } from '@/components/app-layout'
import { ModulesSettings } from '@/components/settings/modules-settings'
import { VaultSettings } from '@/components/settings/vault-settings'
import { CaptureSettings } from '@/components/settings/capture-settings'

export default function Configuracoes() {
  return (
    <AppLayout title="Configurações">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <ModulesSettings />
          <VaultSettings />
          <CaptureSettings />
        </div>
      </main>
    </AppLayout>
  )
}
