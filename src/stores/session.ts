import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import type { Session } from '@/types/api'

const STORAGE_KEY = 'mv_session'

export const useSessionStore = defineStore('session', () => {
  const session = ref<Session | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => session.value !== null)

  function restore() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      session.value = JSON.parse(raw) as Session
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // TODO(真後端): api.login 換成真的端點後，這裡也要同步設定 ctx.token（見 api/http.ts）
  async function login(username: string, password: string) {
    loading.value = true
    try {
      const s = await api.login(username, password)
      session.value = s
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await api.logout()
    session.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { session, loading, isAuthenticated, restore, login, logout }
})
