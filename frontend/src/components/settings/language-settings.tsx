import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSelect } from '@/components/language-select'

export function LanguageSettings() {
  const { t } = useTranslation('settings')
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
          <Languages className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{t('language.title')}</div>
          <div className="text-sm text-muted-foreground">{t('language.description')}</div>
        </div>
      </div>
      <LanguageSelect />
    </div>
  )
}
