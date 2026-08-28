// 圖庫素材與資料夾的共用型別（對齊後端 app/schemas/image.py、app/schemas/folder.py）
//
// 後端把「媒體型態」（mediaType：image／video）與「來源」（source：upload／aiGenerate／
// edit／object／tryon）拆成兩個獨立維度；舊版前端把兩者混在同一個 tag 欄位裡（例如影片的
// tag 直接寫死 'video'），串接後端時已不再成立——這裡拆開對齊，'video' 只會出現在 type，
// 不會再是 source 的值。

/** 素材媒體型態 */
export type MediaType = 'image' | 'video'

/** 素材來源；'ai' 改名為 'aiGenerate' 對齊後端 camelCase 列舉值（ImageSource.api_value） */
export type AssetSource = 'upload' | 'aiGenerate' | 'edit' | 'object' | 'tryon'

export interface Asset {
  id: string // 後端 imageId
  name: string // 後端 imageName
  source: AssetSource // 後端 source
  dim: string // 尺寸顯示文字；後端目前不回寬高，mock／real 皆先用固定佔位值
  type: MediaType // 後端 mediaType
  folderId?: string // 後端 folderId；未歸檔時後端回 null，這裡一律正規化成 undefined
  editable?: boolean // 是否保留可再編輯的圖層資訊（編輯產物專用；純前端概念，後端無對應欄位）
  referencedBy?: number // 後端目前只有布林值 isInUse；這裡用 0/1 表示，沿用既有「> 0 視為被引用」的判斷
  url?: string // 後端 url；mock 沒有真實檔案來源，留空
  createdAt?: string // 後端 createdAt（ISO 字串）
}

/** 使用者歸檔的資料夾（對齊後端 FolderResponse；後端明確表示不存在「系統資料夾」概念） */
export interface Folder {
  folderId: string
  folderName: string
  imageCount: number
}

export interface FolderListResponse {
  items: Folder[]
  unfiledCount: number
}

/** 對齊後端 ImageCounts：依目前查詢條件（不含 mediaType/source 本身）算出的各分類數量 */
export interface ImageCounts {
  all: number
  upload: number
  aiGenerate: number
  edit: number
  object: number
  video: number
}

export interface ImageListResponse {
  total: number
  page: number
  items: Asset[]
  counts: ImageCounts
}

export interface ImageListQuery {
  mediaType?: MediaType
  source?: AssetSource
  /** 後端三態語意：undefined＝不篩資料夾；null＝只篩「未分類」；字串＝篩該資料夾 */
  folderId?: string | null
  q?: string
  page?: number
  pageSize?: number
}

export interface Material {
  materialId: string
  materialName: string
  category: 'background' | 'object' | 'model'
  url: string
}

export interface MaterialListResponse {
  items: Material[]
}

/** 帳號可操作的機器人（`GET /bots`；目前一帳號一 bot，但契約上一律是陣列） */
export interface Bot {
  botId: string
  botName: string
}

/** 批次操作的部分成功結果；後端沒有批次端點，前端用 Promise.allSettled 迴圈單筆呼叫後彙整 */
export interface BatchResult {
  succeededIds: string[]
  failedIds: string[]
}

// 未歸檔素材所屬的預設資料夾（顯示用字面文字；folderId 對應 undefined／後端的 null）
export const UNFILED_FOLDER = '未分類'

/** CATEGORY_TAGS 只會用到 ImageCounts 的這幾個桶（'all' 不是分類，'upload' 走上傳按鈕不走這份清單） */
export type CategoryTag = keyof Omit<ImageCounts, 'all' | 'upload'>

// 圖庫左側「系統分類」：object／aiGenerate／edit 依 source 分類，video 依 mediaType 分類——
// 兩個維度剛好都塞進同一份清單，用 dimension 標記該用哪個欄位比對，避免又把 video 誤當成 source。
export const CATEGORY_TAGS: { tag: CategoryTag; label: string; dimension: 'source' | 'mediaType' }[] = [
  { tag: 'object', label: '物件素材', dimension: 'source' },
  { tag: 'aiGenerate', label: 'AI 生成', dimension: 'source' },
  { tag: 'edit', label: '編輯產物', dimension: 'source' },
  { tag: 'video', label: '影片', dimension: 'mediaType' },
]
