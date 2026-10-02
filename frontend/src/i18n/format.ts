import { useTranslation } from 'react-i18next'

/** Datas e números no idioma ativo; re-renderiza quando o idioma muda. */
export function useFormat() {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en'
  return {
    locale,
    date: (value: Date | string, opts?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleDateString(locale, opts),
    time: (value: Date | string, opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }) =>
      new Date(value).toLocaleTimeString(locale, opts),
    dateTime: (value: Date | string, opts?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleString(locale, opts),
    number: (value: number, opts?: Intl.NumberFormatOptions) => value.toLocaleString(locale, opts),
    compare: (a: string, b: string) => a.localeCompare(b, locale, { sensitivity: 'base' }),
  }
}
