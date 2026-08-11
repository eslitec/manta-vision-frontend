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

  return { consented, loaded, load, give }
})
