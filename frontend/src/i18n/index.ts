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
      convertDetectedLanguage: (lng: string) => (lng.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'),
    },
  })

function syncHtmlLang(lng: string) {
  document.documentElement.lang = lng
}

syncHtmlLang(i18n.language)
i18n.on('languageChanged', syncHtmlLang)

export default i18n
