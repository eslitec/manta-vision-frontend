import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import { clearAuth, setAuth } from '@/api/http'
import { i18n } from '@/lang'
import { useBrandStore } from './brand'
import { useConsentStore } from './consent'
import type { Bot, Session } from '@/types/api'

const STORAGE_KEY = 'mv_session'

export const useSessionStore = defineStore('session', () => {
  const session = ref<Session | null>(null)
  const loading = ref(false)
  /** `GET /bots` 整份清單（之後的機器人切換器用）；登入／還原時取一次，登出清空 */
  const bots = ref<Bot[]>([])
  const namesLoaded = ref(false)
  const brand = useBrandStore()
  const consent = useConsentStore()

  const isAuthenticated = computed(() => session.value !== null)

  /**
   * 側欄、麵包屑、圖庫提示共用的機器人名稱：品牌設定名稱 → 目前 botId 的 botName →
   * i18n 預設。兩支 API 都還沒回來前留空白，免得先閃一下預設字串再換成真名。
   */
  const botName = computed(() => {
    if (!namesLoaded.value) return ''
    const own = bots.value.find((b) => b.botId === session.value?.botId)?.botName
    return brand.profile?.name || own || i18n.global.t('brand.name')
  })

  // 登出後才回來的舊回應不能把上一個帳號的清單寫回來：序號不符就丟掉
  let loadSeq = 0
  async function loadNames() {
    const seq = ++loadSeq
    // 取不到就當沒有值（退到下一層），不擋操作也不顯示錯誤
    const [listed] = await Promise.allSettled([api.listBots(), brand.load()])
    if (seq !== loadSeq) return
    if (listed.status === 'fulfilled') bots.value = listed.value
    namesLoaded.value = true
  }

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
    void loadNames()
  }

  function discard() {
    loadSeq++
    session.value = null
    bots.value = []
    namesLoaded.value = false
    brand.reset()
    consent.reset() // 同意綁使用者：不清的話下一個帳號在同一分頁會沿用上一個人的同意狀態
    localStorage.removeItem(STORAGE_KEY)
    clearAuth()

    // 這裡自己的狀態清完不夠：brand／consent／feed／generationTasks 這幾個
    // store 存的都是綁 Account／bot 的資料，是 setup store 寫法、沒有 Pinia
    // 內建的 $reset() 可用，不主動清的話換帳號登入後會沿用上一個帳號的舊
    // 資料（見 PR #5 review）。這裡才呼叫 use...Store()（不是在 module
    // 頂層），確保 Pinia 已經就緒。
    useBrandStore().$reset()
    useConsentStore().$reset()
    useFeedStore().$reset()
    useGenerationTasksStore().$reset()
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

  return { session, loading, bots, botName, isAuthenticated, restore, login, register, logout, forceLogout }
})
