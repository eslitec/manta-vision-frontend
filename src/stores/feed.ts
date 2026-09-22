import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

// 飼料（點數）餘額 — 全站共用一個錢包（綁 Account）
export const useFeedStore = defineStore('feed', () => {
  const balance = ref(0)
  const monthlyLimit = ref<number | null>(null) // null＝無上限
  const monthUsed = ref(0)
  const estImages = ref(0)
  const estVideos = ref(0)
  const loaded = ref(false)

  async function refresh() {
    const feed = await api.getFeed()
    balance.value = feed.balance
    monthlyLimit.value = feed.monthlyLimit
    monthUsed.value = feed.monthUsed
    estImages.value = feed.estImages
    estVideos.value = feed.estVideos
    loaded.value = true
  }

  // 儲值成功後直接寫入 API 回傳的新餘額，不用再打一次 getFeed（見 TopUpDialog.vue）
  function applyTopUp(newBalance: number) {
    balance.value = newBalance
    loaded.value = true
  }

  return { balance, monthlyLimit, monthUsed, estImages, estVideos, loaded, refresh, applyTopUp }
})
