import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

// 飼料（點數）餘額 — 全站共用一個錢包（綁 Account）
export const useFeedStore = defineStore('feed', () => {
  const balance = ref(0)
  const loaded = ref(false)

  async function refresh() {
    const { balance: b } = await api.getFeed()
    balance.value = b
    loaded.value = true
  }

  // 儲值成功後直接寫入 API 回傳的新餘額，不用再打一次 getFeed（見 TopUpDialog.vue）
  function applyTopUp(newBalance: number) {
    balance.value = newBalance
    loaded.value = true
  }

  // 登出時要清：飼料錢包是綁 Account 的餘額，不清的話換帳號登入後畫面會
  // 沿用上一個帳號的舊餘額，直到某個地方剛好又打一次 refresh() 才會更新。
  function $reset() {
    balance.value = 0
    loaded.value = false
  }

  return { balance, loaded, refresh, applyTopUp, $reset }
})
