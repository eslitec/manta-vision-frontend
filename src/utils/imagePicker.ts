import type { Asset, AssetSource } from '@/types/asset'
import { displayMessage, isFileTooLarge, isUnsupportedFormat } from '@/utils/error'

// ImagePickerDialog 的純邏輯，抽出來才測得到（見 picker-direct-upload design.md 決策 4、5）。

export interface PickerFilter {
  mode: 'asset' | 'object'
  excludeSources: AssetSource[]
  /** 來源篩選 pill：'all' 或某個 AssetSource */
  source: string
  keyword: string
}

// 彈窗清單要不要列這張素材；清單（filtered）與「上傳後新圖會不會被藏住」共用同一套規則。
// 內建素材（source='builtin'）只在物件模式列：生成／編輯／試穿的底圖、參考圖、商品圖端點只查
// images 表，選了 materialId 會 404（見 library-builtin-source design.md 決策 6）。
export function isListedInPicker(a: Asset, f: PickerFilter): boolean {
  if (a.source === 'builtin' && f.mode !== 'object') return false
  if (f.excludeSources.includes(a.source)) return false
  const bySource = f.source === 'all' || a.source === f.source
  const byKeyword = !f.keyword || a.name.includes(f.keyword)
  return bySource && byKeyword
}

// 上傳失敗的訊息：大小／格式用前端文案（mock 的 Error(CODE) 與真後端 413／415 的 ApiError 都認得），
// 其他錯誤跟試穿頁上傳模特照一樣——真後端寫給人看的訊息，沒有就用通用文案。
export function uploadErrorMessage(e: unknown, t: (key: string) => string): string {
  if (isFileTooLarge(e)) return t('errors.fileTooLarge')
  if (isUnsupportedFormat(e)) return t('errors.unsupportedFormat')
  return displayMessage(e, t('errors.submitFailed'))
}
