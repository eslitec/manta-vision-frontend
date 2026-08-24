import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { API_ERROR_CODES, ApiError, CLIENT_ERROR_CODES, isSessionInvalid, type ApiErrorBody } from './errors'

// 打真後端的 axios 實例。
//
// 這一層只負責三件事：帶上兩把鑰匙、把後端的錯誤格式翻成 `ApiError`、
// 在 token 失效時通知應用層。它**不認識** router、store 或任何畫面——
// 反向依賴會讓這個檔案沒辦法單獨載入與測試。

export const http = axios.create({
  // 沒設定時走 '/api'，交給 Vite 的 dev proxy（若有）或同源部署。
  baseURL: import.meta.env.VITE_API_BASE ?? '/api',
  timeout: 30000,
})

/**
 * 兩把鑰匙（後端 `docs/api.md` §2）：
 * - `token`：`Authorization: Bearer`，說「你是誰」
 * - `botId`：`X-Bot-Id`，說「你在操作哪一隻機器人」
 *
 * 這裡只保管值，**不決定它從哪裡來**。登入流程拿到之後呼叫 `setAuth()` 灌進來，
 * 登出時 `clearAuth()`。空字串代表沒有，對應的 header 就不會送出去——
 * 送一個空的 `X-Bot-Id` 會被後端當成格式錯誤擋掉（`BOT_ID_REQUIRED`）。
 */
export const ctx = {
  token: '',
  botId: '',
}

export function setAuth(next: { token?: string; botId?: string }): void {
  if (next.token !== undefined) ctx.token = next.token
  if (next.botId !== undefined) ctx.botId = next.botId
}

export function clearAuth(): void {
  ctx.token = ''
  ctx.botId = ''
}

/**
 * token 失效時要做什麼（清 session、導回登入頁）是應用層的決定，不是 http 層的。
 * 由應用層在啟動時註冊一次，這裡只負責在對的時機叫它。
 */
type SessionExpiredHandler = (error: ApiError) => void
let onSessionExpired: SessionExpiredHandler | null = null

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (ctx.token) config.headers.set('Authorization', `Bearer ${ctx.token}`)
  if (ctx.botId) config.headers.set('X-Bot-Id', ctx.botId)
  return config
})

/** 後端的錯誤 body 一定同時有 code 與 message；少一個就不是它吐的。 */
function isApiErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as ApiErrorBody).code === 'string' &&
    typeof (data as ApiErrorBody).message === 'string'
  )
}

/** 有回應但不是統一格式時，至少依狀態碼給一個能分流的碼。 */
function codeForStatus(status: number): string {
  if (status === 401) return API_ERROR_CODES.TOKEN_INVALID
  if (status === 404) return API_ERROR_CODES.NOT_FOUND
  if (status === 429) return API_ERROR_CODES.RATE_LIMITED
  if (status >= 500) return API_ERROR_CODES.INTERNAL_ERROR
  return CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE
}

export function toApiError(error: AxiosError<unknown>): ApiError {
  const response = error.response

  // 情況一：請求根本沒送達（後端沒起來、網路斷、CORS 被擋）。
  // CORS 失敗在瀏覽器裡看起來就是這個——後端其實有回應，但 JS 讀不到，
  // 所以訊息特別點出這個可能性，省掉一輪「後端明明有開」的排查。
  if (!response) {
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    return new ApiError({
      code: timedOut ? CLIENT_ERROR_CODES.TIMEOUT : CLIENT_ERROR_CODES.NETWORK_ERROR,
      message: timedOut ? '連線逾時，請稍後再試。' : '連不到伺服器，請確認後端已啟動或稍後再試。',
    })
  }

  // 情況二：後端照契約回的錯誤——直接用它的 code 與 message。
  if (isApiErrorBody(response.data)) {
    return new ApiError({
      code: response.data.code,
      message: response.data.message,
      status: response.status,
      fieldErrors: response.data.fieldErrors,
      requestId: response.data.requestId,
    })
  }

  // 情況三：有回應但不是那個格式（反向代理吐的 HTML 502、打錯網址…）。
  return new ApiError({
    code: codeForStatus(response.status),
    message: '伺服器回應異常，請稍後再試。',
    status: response.status,
  })
}

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<unknown>) => {
    const apiError = toApiError(error)

    // 只有「token 不能用了」才通知應用層。登入打錯密碼同樣是 401，
    // 但那要留在登入頁顯示訊息——混在一起會變成無限重導（見 errors.ts）。
    if (isSessionInvalid(apiError)) onSessionExpired?.(apiError)

    return Promise.reject(apiError)
  },
)
