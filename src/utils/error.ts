// 生成類 API 的錯誤判讀小工具，取代各 view 裡的 catch (e: any)。

/** 後端在飼料不足時擲出的錯誤碼 */
export const INSUFFICIENT_FEED = 'INSUFFICIENT_FEED'

export function isInsufficientFeed(e: unknown): boolean {
  return e instanceof Error && e.message === INSUFFICIENT_FEED
}

/** 後端在帳號或密碼錯誤時擲出的錯誤碼 */
export const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS'

export function isInvalidCredentials(e: unknown): boolean {
  return e instanceof Error && e.message === INVALID_CREDENTIALS
}

/** 後端在註冊帳號已被使用時擲出的錯誤碼 */
export const USERNAME_TAKEN = 'USERNAME_TAKEN'

export function isUsernameTaken(e: unknown): boolean {
  return e instanceof Error && e.message === USERNAME_TAKEN
}
