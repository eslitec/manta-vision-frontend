// 生成類 API 的錯誤判讀小工具，取代各 view 裡的 catch (e: any)。

/** 後端在飼料不足時擲出的錯誤碼 */
export const INSUFFICIENT_FEED = 'INSUFFICIENT_FEED'

export function isInsufficientFeed(e: unknown): boolean {
  return e instanceof Error && e.message === INSUFFICIENT_FEED
}
