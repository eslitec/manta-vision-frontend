import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

// 肖像使用同意：一次同意、全站生效（綁 Account）
export const useConsentStore = defineStore('consent', () => {
  const consented = ref(false)
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    const { consented: c } = await api.getConsent()
    consented.value = c
    loaded.value = true
  }

  async function give() {
    await api.giveConsent()
    consented.value = true
  }

  // 登出時要清：同意狀態綁 Account，`load()` 的 `if (loaded.value) return` 會
  // 讓換帳號登入後直接沿用上一個帳號「已同意」的狀態，該顯示的同意畫面被跳過。
  function $reset() {
    consented.value = false
    loaded.value = false
  }

  return { consented, loaded, load, give, $reset }
})
