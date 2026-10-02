import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/types'

export function LanguageSelect() {
  const { t, i18n } = useTranslation(['common', 'settings'])
  const { setLocale } = useAuth()
  const current = i18n.language as Locale

  async function choose(locale: Locale) {
    if (locale === current) return
    try {
      await setLocale(locale)
      toast.success(t('settings:language.saved'))
    } catch {
      toast.error(t('settings:language.error'))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Languages className="h-4 w-4" />
          {t(`language.${current}`)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map(locale => (
          <DropdownMenuItem key={locale} onSelect={() => void choose(locale)}>
            <Check className={`h-4 w-4 ${locale === current ? 'opacity-100' : 'opacity-0'}`} />
            {t(`language.${locale}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
