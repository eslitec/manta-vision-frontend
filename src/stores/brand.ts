import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import { i18n } from '@/lang'
import type { BrandProfile } from '@/types/api'

// 品牌設定（只有行銷 PO 文帶入；與機器人 1:1）
export const useBrandStore = defineStore('brand', () => {
  const profile = ref<BrandProfile | null>(null)
  const saving = ref(false)

  // 進行中的 GET /brand：session store（登入／還原）與首頁會同時呼叫 load()，
  // 只看 profile 有沒有值擋不住兩發並行，所以共用同一個進行中的請求。
  let inflight: Promise<void> | null = null
  let epoch = 0 // reset 一次加一：登出前送出、登出後才回來的存檔回應不寫回（同 feed store）

  function load(force = false): Promise<void> {
    if (profile.value && !force) return Promise.resolve()
    if (!inflight) {
      const request: Promise<void> = api
        .getBrand()
        .then((loaded) => {
          if (inflight !== request) return // reset() 之後才回來的舊帳號回應，不能寫進來
          // 真後端從沒設定過就回空字串／null；沒有預設文案的話合規頁的兩個
          // textarea 會是空的，使用者容易誤以為欄位壞掉。用跟畫面一致的
          // i18n 預設文案補上，只在「真的沒有值」時才補，不覆蓋既有設定。
          if (!loaded.portraitConsent) loaded.portraitConsent = i18n.global.t('brandSettings.defaults.portraitConsent')
          if (!loaded.imageLicense) loaded.imageLicense = i18n.global.t('brandSettings.defaults.imageLicense')
          profile.value = loaded
        })
        .finally(() => {
          if (inflight === request) inflight = null
        })
      inflight = request
    }
    return inflight
  }

  /** 登出時清掉：下一個帳號登入時要重新取，進行中的舊請求回來也不採用 */
  function reset() {
    epoch++
    profile.value = null
    inflight = null
    saving.value = false // 上一個帳號還在路上的存檔不會回來關它（見 save）
  }

  async function save() {
    if (!profile.value) return
    const mine = epoch
    saving.value = true
    try {
      // 用存檔後端回傳的內容覆蓋本地狀態——尤其是 Logo：本地存的可能還是
      // data: 預覽網址，存檔後端會換成真正的 R2 網址；不寫回去的話下一次
      // 存檔又會偵測到 data: URL，把同一張 Logo當成新檔案重複上傳一次。
      const saved = await api.saveBrand(profile.value)
      // 回來前已登出／換帳號：上一個帳號的品牌資料不能寫進下一個帳號的 store
      if (mine === epoch) profile.value = saved
    } finally {
      if (mine === epoch) saving.value = false
    }
  }

  return { profile, saving, load, save, reset }
})
