import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enTranslations from '../locales/en.json'
import ruTranslations from '../locales/ru.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      ru: {
        translation: ruTranslations
      }
    },
    lng: 'en', // Default language (always start with English)
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage'], // Only use localStorage, ignore browser language
      caches: ['localStorage'],
      lookupLocalStorage: 'frovo_language'
    }
  })

export default i18n

