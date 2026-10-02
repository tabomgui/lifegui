import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/use-auth'
import { LanguageSelect } from '@/components/language-select'

export function WelcomeStep() {
  const { t } = useTranslation('onboarding')
  const { user } = useAuth()
  const firstName = user?.name.split(' ')[0] ?? ''
  return (
    <div className="space-y-4 py-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          {firstName ? t('welcome.titleWithName', { name: firstName }) : t('welcome.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('welcome.description')}</p>
      </div>
      <div className="flex justify-center">
        <LanguageSelect />
      </div>
    </div>
  )
}
