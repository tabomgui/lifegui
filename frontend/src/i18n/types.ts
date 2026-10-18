/** Mesma forma do recurso em inglês, com strings livres: o pt-BR tem que ter exatamente as mesmas chaves. */
export type Messages<T> = { [K in keyof T]: T[K] extends string ? string : Messages<T[K]> }

export const SUPPORTED_LOCALES = ['en', 'pt-BR'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}
