import i18n from '@/i18n'

/** Documentação pública do lifegui (repo tabomgui/lifegui-docs), no idioma ativo. */
const DOCS_ORIGIN = 'https://docs-lifegui.hengen.com.br'

export const docsUrl = (path = '') =>
  `${DOCS_ORIGIN}${i18n.language === 'pt-BR' ? '/pt-BR' : ''}/docs${path}`
