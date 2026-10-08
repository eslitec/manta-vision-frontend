import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import { i18n } from '@/lang'
import type { BrandProfile } from '@/types/api'

// 品牌設定（只有行銷 PO 文帶入；與機器人 1:1）
export const useBrandStore = defineStore('brand', () => {
  const profile = ref<BrandProfile | null>(null)
  const saving = ref(false)

  async function load(force = false) {
    if (profile.value && !force) return
    const loaded = await api.getBrand()
    // 真後端從沒設定過就回空字串／null；沒有預設文案的話合規頁的兩個
    // textarea 會是空的，使用者容易誤以為欄位壞掉。用跟畫面一致的
    // i18n 預設文案補上，只在「真的沒有值」時才補，不覆蓋既有設定。
    if (!loaded.portraitConsent) loaded.portraitConsent = i18n.global.t('brandSettings.defaults.portraitConsent')
    if (!loaded.imageLicense) loaded.imageLicense = i18n.global.t('brandSettings.defaults.imageLicense')
    profile.value = loaded
  }

  async function save() {
    if (!profile.value) return
    saving.value = true
    try {
      // 用存檔後端回傳的內容覆蓋本地狀態——尤其是 Logo：本地存的可能還是
      // data: 預覽網址，存檔後端會換成真正的 R2 網址；不寫回去的話下一次
      // 存檔又會偵測到 data: URL，把同一張 Logo當成新檔案重複上傳一次。
      profile.value = await api.saveBrand(profile.value)
    } finally {
      saving.value = false
    }
  }

  // 登出時要清：brand 資料是綁 bot（`X-Bot-Id`）的，不清的話換帳號／換 bot
  // 登入後 `load()` 的 `if (profile.value && !force) return` 會直接跳過重抓，
  // 畫面顯示的會是上一個帳號的品牌設定。這個 setup store 寫法沒有 Pinia
  // 內建的 `$reset()` 可用，所以自己補一個（session.ts::discard() 會呼叫）。
  function $reset() {
    profile.value = null
  }

  return { profile, saving, load, save, $reset }
})
