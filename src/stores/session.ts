import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import { clearAuth, setAuth } from '@/api/http'
import type { Session } from '@/types/api'

const STORAGE_KEY = 'mv_session'

export const useSessionStore = defineStore('session', () => {
  const session = ref<Session | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => session.value !== null)

  /**
   * 收下一個新的登入狀態：存記憶體、存 localStorage，**並把兩把鑰匙灌進 http 層**。
   *
   * 最後那一步最容易漏。漏了的話畫面看起來是登入的（session 有值），但每一支
   * API 都不帶 Authorization，於是全部 401——而且重新整理之後才會發作，很難聯想。
   */
  function adopt(next: Session) {
    session.value = next
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setAuth({ token: next.token, botId: next.botId })
  }

  function discard() {
    session.value = null
    localStorage.removeItem(STORAGE_KEY)
    clearAuth()
  }

  function restore() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const saved = JSON.parse(raw) as Session

      // 憑證沒有續期機制，過期的就別還原——還原了也只是讓每支 API 都 401，
      // 使用者會看到一個「登入著但什麼都讀不到」的壞掉畫面。
      if (saved.expiresAt && saved.expiresAt <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }

      adopt(saved)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  async function login(username: string, password: string) {
    loading.value = true
    try {
      adopt(await api.login(username, password))
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, password: string) {
    loading.value = true
    try {
      adopt(await api.register(username, password))
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await api.logout()
    } finally {
      // 後端打不通也要在前端登出——不然使用者會卡在「按了登出卻還是登入中」。
      discard()
    }
  }

  /**
   * token 已經失效時用（由 http 層通知）。**不打 `api.logout()`**——
   * 那張 token 已經不能用了，再打一次只會再收到一次 401。
   */
  function forceLogout() {
    discard()
  }

  return { session, loading, isAuthenticated, restore, login, register, logout, forceLogout }
})
