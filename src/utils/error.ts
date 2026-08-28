// 各 view 判讀 API 錯誤的小工具，取代 catch (e: any)。
//
// 有兩種錯誤來源要同時認得：
// - 假後端擲的是 `new Error(CODE)`——錯誤碼放在 `message`
// - 真後端擲的是 `ApiError`——錯誤碼放在 `code`，`message` 是給人看的中文
//
// 切換資料來源時 view 不必改任何一行，就是靠這裡吸收掉差異。

import { isApiError } from '@/api/errors'

/**
 * 拿一句可以直接顯示給使用者看的訊息。
 *
 * 真後端的 `ApiError` 自帶寫給人看的訊息（例如「帳號或密碼錯誤」），直接用；
 * 其他情況（假後端的 `Error('INVALID_CREDENTIALS')`、程式自己爆的例外）
 * 一律用呼叫端給的預設文案——**絕對不能把錯誤碼或堆疊丟到畫面上**。
 */
export function displayMessage(e: unknown, fallback: string): string {
  return isApiError(e) ? e.message : fallback
}

function hasCode(e: unknown, code: string): boolean {
  if (isApiError(e)) return e.code === code

  return e instanceof Error && e.message === code
}

// 後端碼表定案是複數形（有 S）：INSUFFICIENT_FEEDS。函式名稱維持 isInsufficientFeed
// （英文語感兩種都通），呼叫端不用因為這個字尾改動。
/** 後端在飼料不足時擲出的錯誤碼 */
export const INSUFFICIENT_FEEDS = 'INSUFFICIENT_FEEDS'

export function isInsufficientFeed(e: unknown): boolean {
  return hasCode(e, INSUFFICIENT_FEEDS)
}

/** 後端在帳號或密碼錯誤時擲出的錯誤碼 */
export const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS'

export function isInvalidCredentials(e: unknown): boolean {
  return hasCode(e, INVALID_CREDENTIALS)
}

/** 後端在註冊帳號已被使用時擲出的錯誤碼 */
export const USERNAME_TAKEN = 'USERNAME_TAKEN'

export function isUsernameTaken(e: unknown): boolean {
  return hasCode(e, USERNAME_TAKEN)
}

// ── 圖庫／資料夾（feat/gallery-finish，見 docs/api-status.md）──

/** 後端在資料夾名稱重複時擲出的錯誤碼（`POST /folders`、`PUT /folders/{id}`） */
export const DUPLICATE_NAME = 'DUPLICATE_NAME'

export function isDuplicateName(e: unknown): boolean {
  return hasCode(e, DUPLICATE_NAME)
}

/** 後端在資料夾數量已達上限（200 個／機器人）時擲出的錯誤碼 */
export const FOLDER_LIMIT_EXCEEDED = 'FOLDER_LIMIT_EXCEEDED'

export function isFolderLimitExceeded(e: unknown): boolean {
  return hasCode(e, FOLDER_LIMIT_EXCEEDED)
}

/** 後端擋下刪除「正被使用中」素材時擲出的錯誤碼 */
export const ASSET_IN_USE = 'ASSET_IN_USE'

export function isAssetInUse(e: unknown): boolean {
  return hasCode(e, ASSET_IN_USE)
}

/** 上傳檔案超過大小上限（10MB）時擲出的錯誤碼 */
export const FILE_TOO_LARGE = 'FILE_TOO_LARGE'

export function isFileTooLarge(e: unknown): boolean {
  return hasCode(e, FILE_TOO_LARGE)
}

/** 上傳檔案格式不支援時擲出的錯誤碼（僅支援 jpg／png／webp） */
export const UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT'

export function isUnsupportedFormat(e: unknown): boolean {
  return hasCode(e, UNSUPPORTED_FORMAT)
}
