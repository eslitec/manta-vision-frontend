import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

// 肖像使用同意：一次同意、全站生效（綁使用者個人，不綁機器人）
export const useConsentStore = defineStore('consent', () => {
  const consented = ref(false)
  /** GET 已回來過：沒回來前 consented=false 只是預設值，畫面不該當成「未同意」顯示提示 */
  const loaded = ref(false)

  // 進行中的 GET：掛載時的 load() 與使用者搶在回應前上傳／生成時的 load() 共用同一發（同 brand store）
  let inflight: Promise<void> | null = null
  let epoch = 0 // $reset 一次加一：登出前送出的 PUT 晚到，不能把下一個帳號標成已同意

  function load(): Promise<void> {
    if (loaded.value) return Promise.resolve()
    if (!inflight) {
      const request: Promise<void> = api
        .getConsent()
        .then(({ consented: c }) => {
          if (inflight !== request) return // $reset() 之後才回來的舊帳號回應，不能寫進來
          consented.value = c
          loaded.value = true
        })
        .finally(() => {
          if (inflight === request) inflight = null
        })
      inflight = request
    }
    return inflight
  }

  async function give() {
    if (consented.value) return // 已同意就不重打 PUT（重打會覆寫後端的 updatedAt）
    const mine = epoch
    await api.giveConsent()
    if (mine === epoch) consented.value = true
  }

  /** 登出時清掉：同意綁使用者，下一個帳號要重新取，進行中的舊請求回來也不採用 */
  function $reset() {
    epoch++
    consented.value = false
    loaded.value = false
    inflight = null
  }

  return { consented, loaded, load, give, $reset }
})
