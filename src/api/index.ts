import { mockApi } from './mock'
import { realApi } from './real'

// 全站唯一的 API 入口。
//
// 預設走假資料；要打真後端請在 `.env` 設 `VITE_USE_MOCK=false`。
// 預設值刻意保守——沒設定環境變數就整站連不上，比繼續用假資料難查得多。
const useRealBackend = import.meta.env.VITE_USE_MOCK === 'false'

export const api = useRealBackend ? realApi : mockApi

export { http, ctx, setAuth, clearAuth, setSessionExpiredHandler } from './http'
export { ApiError, hasErrorCode, fieldErrorsOf, isApiError } from './errors'
