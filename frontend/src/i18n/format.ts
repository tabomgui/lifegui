import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

function stripTrailingDot(s: string): string {
  return s.replace(/\.$/, '')
}

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Datas e números no idioma ativo; re-renderiza quando o idioma muda. */
export function useFormat() {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en'

  // Abreviações de dia da semana (índice = dia, 0=dom..6=sáb) e de mês (índice = mês,
  // 0=jan..11=dez) no idioma ativo — recalculadas só quando o locale muda.
  // 1/jan/2023 é domingo, usado só como referência pra formatar o rótulo do dia.
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dow) =>
        capitalize(stripTrailingDot(new Date(2023, 0, 1 + dow).toLocaleDateString(locale, { weekday: 'short' })))),
    [locale],
  )
  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        stripTrailingDot(new Date(2023, month, 1).toLocaleDateString(locale, { month: 'short' }))),
    [locale],
  )

  return {
    locale,
    date: (value: Date | string, opts?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleDateString(locale, opts),
    time: (value: Date | string, opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }) =>
      new Date(value).toLocaleTimeString(locale, opts),
    dateTime: (value: Date | string, opts?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleString(locale, opts),
    number: (value: number, opts?: Intl.NumberFormatOptions) => value.toLocaleString(locale, opts),
    compare: (a: string, b: string) => a.localeCompare(b, locale, { sensitivity: 'base' }),
    // Lista por extenso no idioma ativo ("A, B e C" / "A, B and C"), em vez de join(', ').
    list: (items: string[]) => new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items),
    // Abreviação do dia da semana (0=dom..6=sáb), capitalizada e sem ponto final.
    weekdayShort: (dow: number) => weekdayLabels[dow],
    // Abreviação do mês de `value`, sem ponto final (minúscula, como nos rótulos do heatmap).
    monthShort: (value: Date | string) => monthLabels[new Date(value).getMonth()],
    // Dia+mês compacto: pt-BR "5/3" (sem zero à esquerda); demais idiomas "Mar 5".
    // `utc: true` lê os componentes em UTC (datas que vêm como 'Y-m-dT00:00:00Z').
    dayMonth: (value: Date | string, opts?: { utc?: boolean }) => {
      const d = new Date(value)
      if (locale === 'pt-BR') {
        const day = opts?.utc ? d.getUTCDate() : d.getDate()
        const month = (opts?.utc ? d.getUTCMonth() : d.getMonth()) + 1
        return `${day}/${month}`
      }
      return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', ...(opts?.utc ? { timeZone: 'UTC' } : {}) })
    },
  }
}
