import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type { AiModel } from '@/types/api'

// 圖生圖可用的 AI 模型清單（由後端提供）
export const useModelsStore = defineStore('models', () => {
  const models = ref<AiModel[]>([])
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    models.value = await api.listModels()
    loaded.value = true
  }

  return { models, loaded, load }
})
