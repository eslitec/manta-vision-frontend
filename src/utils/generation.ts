// 生成頁送出前的欄位轉換。抽成純函式是為了讓 node 環境的 vitest 測得到（沒有元件測試）。
import type { GeneratedPost } from '@/types/api'

/** 畫面上的「參考強度」越高越貼近參考圖；後端 strength 方向相反（低＝貼近），所以送出前翻轉 */
export const toBackendStrength = (referenceStrength: number) => Math.round((1 - referenceStrength) * 100) / 100

/**
 * 種子欄：`type="number"` 的 v-model 會把輸入轉成數字，清空時仍是 ''。
 * 空白＝隨機（undefined）；0 以上的整數照送（0 不能被當成空白）；負數、小數回 null，由畫面擋下——
 * 後端（seed ge=0）只會回一句籠統的「輸入值不在允許範圍」。
 */
export function parseSeed(input: string | number): number | undefined | null {
  if (input === '') return undefined
  const n = Number(input)
  return Number.isInteger(n) && n >= 0 ? n : null
}

/** 「換一張圖」只換配圖、「重寫文案」只換文案與 hashtag，另一半保留；第一次產生或沒指定 only 時整包換掉 */
export function mergePost(
  prev: GeneratedPost | null,
  next: GeneratedPost,
  only?: 'imageOnly' | 'textOnly',
): GeneratedPost {
  if (!prev || !only) return next
  return only === 'imageOnly' ? { ...prev, poster: next.poster } : { ...prev, copy: next.copy, hashtags: next.hashtags }
}

/**
 * 主按鈕下一次只重做哪一半：「文案＋配圖」只成功一半時是失敗的那一半（已成功的那半不再扣點），
 * 那一半單獨重做成功後回 undefined（照所選輸出類型）。prev：目前的目標；only：這次只做了哪一半。
 */
export function retryTarget(
  prev: 'imageOnly' | 'textOnly' | undefined,
  next: GeneratedPost,
  only?: 'imageOnly' | 'textOnly',
): 'imageOnly' | 'textOnly' | undefined {
  if (only) return only === prev ? undefined : prev
  return next.partialError ? (next.poster ? 'textOnly' : 'imageOnly') : undefined
}
