// 圖庫素材的共用型別
export type AssetTag = 'upload' | 'object' | 'ai' | 'edit' | 'video'

export interface Asset {
  id: string
  name: string
  source: string // 顯示用來源標籤文字（上傳／物件素材／AI 生成／編輯產物／影片）
  tag: AssetTag // 對應顏色與篩選
  dim: string
  type?: 'image' | 'video'
  folders?: string[] // 使用者歸檔的資料夾（多重歸屬，像相簿／標籤；與「來源」是獨立維度）
}

// 未歸檔素材所屬的預設資料夾
export const UNFILED_FOLDER = '未分類'

// 圖庫左側「系統分類」：依素材本身的 tag 分類，跟使用者自訂的「我的資料夾」是不同維度
export const CATEGORY_TAGS: { tag: AssetTag; label: string }[] = [
  { tag: 'object', label: '物件素材' },
  { tag: 'ai', label: 'AI 生成' },
  { tag: 'edit', label: '編輯產物' },
  { tag: 'video', label: '影片' },
]
