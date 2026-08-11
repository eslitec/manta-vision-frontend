import { createI18n } from 'vue-i18n'
import en from './en'
import zhHant from './zh-Hant'

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'zh-Hant',
  fallbackLocale: 'zh-Hant',
  messages: {
    'zh-Hant': zhHant,
    en,
  },
})
