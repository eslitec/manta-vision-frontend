import axios from 'axios'

// axios 實例 — 之後所有真實 API 都走這裡
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 30000,
})

// 目前登入／機器人上下文（之後接真正的 auth store）
export const ctx = {
  botId: 'bot_rihan',
  token: '',
}

// 請求攔截器：帶 bot_id 與 token（多租戶以 bot_id 隔離）
http.interceptors.request.use((config) => {
  config.headers = config.headers ?? {}
  config.headers['X-Bot-Id'] = ctx.botId
  if (ctx.token) config.headers.Authorization = `Bearer ${ctx.token}`
  return config
})

// 回應攔截器：統一錯誤處理
http.interceptors.response.use(
  (res) => res,
  (err) => {
    // TODO: 統一錯誤提示／401 導向登入
    return Promise.reject(err)
  },
)
