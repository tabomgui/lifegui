import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { namespaces, resources } from './resources'
import { SUPPORTED_LOCALES } from './types'

// Antes do login vale o idioma do navegador; depois, o do usuário (auth-context).
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: namespaces,
    defaultNS: 'common',
    supportedLngs: [...SUPPORTED_LOCALES],
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['navigator'],
      caches: [],
      // Normaliza variantes de pt (pt-PT etc.) pra pt-BR e de en (en-GB etc.) pra
      // 'en', que é o código suportado; outros idiomas ficam intactos pra não
      // furar na frente de um pt-BR/en legítimo mais adiante na lista do
      // navegador (a resolução do i18next via supportedLngs/fallbackLng cuida deles).
      convertDetectedLanguage: (lng: string) => {
        const base = lng.toLowerCase()
        if (base.startsWith('pt')) return 'pt-BR'
        if (base.startsWith('en')) return 'en'
        return lng
      },
    },
  })

function syncHtmlLang(lng: string) {
  document.documentElement.lang = lng
}

syncHtmlLang(i18n.language)
i18n.on('languageChanged', syncHtmlLang)

export default i18n
