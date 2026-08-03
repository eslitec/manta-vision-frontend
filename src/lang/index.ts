import { createI18n } from 'vue-i18n'
import { watch } from 'vue'
import zhHant from './zh-Hant'
import en from './en'

// 支援的語言（跨國客戶用；預設繁中，缺字回退繁中）
export const SUPPORTED_LOCALES = ['zh-Hant', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'zh-Hant'
const STORAGE_KEY = 'mv.locale'

function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(v)
}

// 初始語言：優先用上次記住的；沒有就依瀏覽器語言猜；再不行用預設。
function detectInitial(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* 隱私模式／無 localStorage：略過 */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  if (nav.startsWith('zh')) return 'zh-Hant'
  if (nav.startsWith('en')) return 'en'
  return DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false, // Composition API 模式
  globalInjection: true, // 模板可直接用 $t，不必每個元件都 import
  locale: detectInitial(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { 'zh-Hant': zhHant, en },
})

// 記住使用者的語言選擇（跨 reload / 重開），並同步 <html lang>
watch(
  () => i18n.global.locale.value,
  (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* 無 localStorage：略過 */
    }
    if (typeof document !== 'undefined') document.documentElement.lang = locale
  },
  { immediate: true },
)
