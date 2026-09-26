import { computed, ref } from 'vue'

// 圖片編輯器的上一步／下一步（editor-history-shortcuts）。純邏輯、不碰 DOM，vitest 以 node 環境直接測。
// ponytail: 快照＝整份可編輯文件的 JSON 字串。欄位全是原始型別，JSON 來回無損，字串相等即沒變、
// 天生不可變；文件哪天出現 Map／Date／Blob 等非 JSON 值，改 structuredClone＋自寫比對。
export const HISTORY_LIMIT = 50
export const MERGE_WINDOW_MS = 1000

export type HistoryEntry = { doc: string; selected: string; mergeKey: string; at: number }

export function useEditorHistory(limit = HISTORY_LIMIT, mergeWindowMs = MERGE_WINDOW_MS) {
  const stack: HistoryEntry[] = []
  const index = ref(-1)
  const size = ref(0)
  // 只有「上一個動作是 record」才准合併；undo／redo／reset 之後一律另起一步
  let canMerge = false

  const reset = (doc: string, selected: string) => {
    stack.splice(0, stack.length, { doc, selected, mergeKey: '', at: 0 })
    index.value = 0
    size.value = 1
    canMerge = false
  }
  // 回傳 true＝新增或合併了一步；文件沒變回 false（不動 redo，還原後的 watch 回彈就走這條）
  const record = (doc: string, selected: string, mergeKey = '', now = Date.now()) => {
    const current = stack[index.value]
    if (!current) {
      reset(doc, selected)
      return true
    }
    if (current.doc === doc) return false
    stack.length = index.value + 1 // 新操作清掉 redo
    if (canMerge && mergeKey && current.mergeKey === mergeKey && now - current.at <= mergeWindowMs) {
      Object.assign(current, { doc, selected, at: now })
      // 合併後又回到上一步的樣子（例：輸入框打字後馬上在框內原生撤銷）＝這一步等於沒做，拿掉，
      // 否則會多出一次「按了畫面沒變」的上一步
      if (stack[index.value - 1]?.doc === doc) stack.pop()
    } else {
      stack.push({ doc, selected, mergeKey, at: now })
      if (stack.length > limit + 1) stack.shift()
    }
    index.value = stack.length - 1
    size.value = stack.length
    canMerge = true
    return true
  }
  const undo = () => {
    if (index.value <= 0) return undefined
    canMerge = false
    index.value -= 1
    return stack[index.value]
  }
  const redo = () => {
    if (index.value >= size.value - 1) return undefined
    canMerge = false
    index.value += 1
    return stack[index.value]
  }
  return {
    reset,
    record,
    undo,
    redo,
    canUndo: computed(() => index.value > 0),
    canRedo: computed(() => index.value < size.value - 1),
  }
}

// undo／redo 後該選哪個圖層（對齊 Figma）：重新出現的圖層優先 → 目前選取仍在就保留 → 該步紀錄的選取
// → 原圖 → 空。prevKeys／nextKeys＝還原前後的圖層 key（依 layers 順序）。
export function pickSelection(prevKeys: string[], nextKeys: string[], current: string, recorded: string) {
  const revived = nextKeys.find((key) => !prevKeys.includes(key))
  if (revived) return revived
  if (nextKeys.includes(current)) return current
  if (nextKeys.includes(recorded)) return recorded
  return nextKeys.includes('original') ? 'original' : ''
}
