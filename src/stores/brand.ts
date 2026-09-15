import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type { BrandProfile } from '@/types/api'

// 品牌設定（只有行銷 PO 文帶入；與機器人 1:1）
export const useBrandStore = defineStore('brand', () => {
  const profile = ref<BrandProfile | null>(null)
  const saving = ref(false)

  async function load(force = false) {
    if (profile.value && !force) return
    profile.value = await api.getBrand()
  }

  async function save() {
    if (!profile.value) return
    saving.value = true
    try {
      await api.saveBrand(profile.value)
    } finally {
      saving.value = false
    }
  }

  return { profile, saving, load, save }
})
