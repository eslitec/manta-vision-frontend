import { http } from './http'
import { mockApi } from './mock'
import type { Session } from '@/types/api'

// 打真後端的 API 實作。
//
// **目前只有身分驗證這一段是真的。** 後端 33 支端點裡只實作了 auth 三支與
// `GET /bots`，其餘（圖庫、飼料、品牌、行銷、指標、修圖、影片）都還是空殼，
// 所以這裡把 `mockApi` 展開當底，只覆寫已經接得上的方法。
//
// 後端每補完一支，就把對應的方法從這裡加上去——展開的假資料會自動被蓋掉，
// 不必一次全部切換，也不會有「切過去整站空白」的斷崖。

/** `POST /auth/login` 的回應（後端 `docs/api.md` #1） */
interface LoginResponse {
  token: string
  role: string
  /** 憑證效期（秒）。目前是 7 天，且**沒有續期機制** */
  expiresIn: number
  userId: string
  botId: string
}

/** `POST /auth/register` 的回應（後端 `docs/api.md` #2）——注意沒有 token */
interface RegisterResponse {
  userId: string
  botId: string
}

function toSession(username: string, data: LoginResponse): Session {
  return {
    username,
    // 後端沒有「顯示名稱」這個欄位，帳號本身就是顯示名稱
    displayName: username,
    token: data.token,
    botId: data.botId,
    role: data.role,
    // 存絕對時間而非剩餘秒數：重新整理後才判斷得出來還有沒有效
    expiresAt: Date.now() + data.expiresIn * 1000,
  }
}

async function login(username: string, password: string): Promise<Session> {
  const { data } = await http.post<LoginResponse>('/auth/login', { username, password })

  return toSession(username, data)
}

async function register(username: string, password: string): Promise<Session> {
  // 註冊只回 userId／botId，**不給 token**——後端刻意把「開帳號」與「取得憑證」
  // 分成兩件事。但使用者的期待是「註冊完就進去了」，所以這裡接著登入一次。
  await http.post<RegisterResponse>('/auth/register', { username, password })

  return login(username, password)
}

async function logout(): Promise<void> {
  // 後端會把這張 token 加進黑名單（它沒有續期機制，這是唯一能讓外洩的 token 失效的手段）
  await http.post('/auth/logout')
}

export const realApi = {
  ...mockApi,
  login,
  register,
  logout,
}
