import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/app-layout'
import { ModulesSettings } from '@/components/settings/modules-settings'
import { VaultSettings } from '@/components/settings/vault-settings'
import { CaptureSettings } from '@/components/settings/capture-settings'
import { CalendarSettings } from '@/components/settings/calendar-settings'
import { OnboardingSettings } from '@/components/settings/onboarding-settings'
import { LanguageSettings } from '@/components/settings/language-settings'

export default function Configuracoes() {
  const { t } = useTranslation('common')
  return (
    <AppLayout title={t('nav.settings')}>
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <LanguageSettings />
          <ModulesSettings />
          <CalendarSettings />
          <VaultSettings />
          <CaptureSettings />
          <OnboardingSettings />
        </div>
      </main>
    </AppLayout>
  )
}
