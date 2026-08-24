// 後端統一錯誤格式的前端對應（後端 `docs/api.md` §3）。
//
// 所有 4xx/5xx 都回同一個形狀：
//   { code, message, fieldErrors, requestId }
//
// **前端一律認 `code`，不比對 message 字串**——後端改文案不該讓前端壞掉。
// 這裡的碼表是後端 `app/errors.py` 的 ErrorCode 鏡像，新增時兩邊要一起改，
// 並且先進 `docs/api.md` §3 的碼表（那份表是前後端的共同契約）。

/** 後端定義的錯誤碼（`app/errors.py` 的 ErrorCode） */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  BOT_ID_REQUIRED: 'BOT_ID_REQUIRED',
  BOT_FORBIDDEN: 'BOT_FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

/**
 * 純前端的錯誤碼——請求根本沒到後端，所以不會有後端的碼。
 * 刻意跟後端碼放在不同物件：這兩個永遠不會出現在 `docs/api.md` 的碼表裡。
 */
export const CLIENT_ERROR_CODES = {
  /** 連不到伺服器（後端沒起來、網路斷了、CORS 被擋） */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** 超過 axios 的 timeout */
  TIMEOUT: 'TIMEOUT',
  /** 有回應但不是後端的統一格式（例如反向代理吐的 HTML 502） */
  UNEXPECTED_RESPONSE: 'UNEXPECTED_RESPONSE',
} as const

export type ApiErrorCode =
  | (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]
  | (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES]
  // 後端先上了新碼、前端還沒同步時不該讓型別爆掉，只是失去自動完成
  | (string & {})

/** 後端錯誤回應的 body（`docs/api.md` §3） */
export interface ApiErrorBody {
  code: string
  message: string
  /** 欄位名 → 錯誤訊息陣列，標到對應輸入框用 */
  fieldErrors: Record<string, string[]> | null
  /** 使用者回報問題時用來查 log */
  requestId: string
}

/**
 * 所有 API 失敗統一擲出這個型別。
 *
 * `message` 帶的是後端寫給人看的訊息（可直接顯示），判斷分支請一律用 `code`。
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  /** HTTP 狀態碼；請求沒送達時為 0 */
  readonly status: number
  readonly fieldErrors: Record<string, string[]> | null
  readonly requestId: string | null

  constructor(init: {
    code: ApiErrorCode
    message: string
    status?: number
    fieldErrors?: Record<string, string[]> | null
    requestId?: string | null
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status ?? 0
    this.fieldErrors = init.fieldErrors ?? null
    this.requestId = init.requestId ?? null
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** `hasErrorCode(e, 'TOKEN_EXPIRED')`——比 `e instanceof ApiError && e.code === …` 短 */
export function hasErrorCode(error: unknown, code: ApiErrorCode): boolean {
  return isApiError(error) && error.code === code
}

/** 取某個欄位的錯誤訊息，沒有就回空陣列——樣板可以直接 v-for */
export function fieldErrorsOf(error: unknown, field: string): string[] {
  return (isApiError(error) && error.fieldErrors?.[field]) || []
}

/**
 * 這兩個碼代表「這張 token 不能用了」，該把使用者送回登入頁。
 *
 * **不包含 `INVALID_CREDENTIALS`**——那也是 401，但它是「這次登入打錯密碼」，
 * 要留在登入頁顯示錯誤訊息，不是把人踢出去。混在一起會讓打錯密碼變成無限
 * 重導。
 */
export const SESSION_INVALID_CODES: readonly ApiErrorCode[] = [
  API_ERROR_CODES.TOKEN_EXPIRED,
  API_ERROR_CODES.TOKEN_INVALID,
]

export function isSessionInvalid(error: unknown): boolean {
  return isApiError(error) && SESSION_INVALID_CODES.includes(error.code)
}
