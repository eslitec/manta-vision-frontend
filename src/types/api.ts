import type {
  Asset,
  BatchResult,
  Bot,
  Folder,
  FolderListResponse,
  ImageCounts,
  ImageListQuery,
  ImageListResponse,
  Material,
  MaterialListResponse,
} from './asset'

// ── 圖生圖模型 ──
export interface AiModel {
  id: string
  name: string
  provider: string
  costPerImage: number // 單張飼料成本
}

// ── 生成請求／結果 ──
export interface GenerateImageReq {
  modelId: string
  referenceId?: string
  prompt: string
  count: number
  referenceStrength?: number // 參考強度 0..1（img2img：越低越貼近參考圖）
  negativePrompt?: string // 負面提示：不希望出現的元素
  seed?: number // 種子；未指定＝隨機（固定可重現同一張）
}
export interface GeneratedImage {
  id: string
  url?: string // 之後由後端回傳
  adopted: boolean // 是否已採用（下載或存入圖庫）
  savedAssetId?: string // 存入圖庫後的素材 id
}

export interface GeneratePostReq {
  productImageId?: string // 商品圖＝產圖時的「錨」（去背後合成，商品本身不被改）
  intro: string // 商品描述＝主題來源
  applyBrand: boolean // 套用品牌設定（色票／Logo／語氣，由後端依 bot_id 讀取）
  ratio?: string // 版位比例（'1:1'｜'4:5'｜'9:16'｜'16:9'），影響構圖與輸出
}
export interface GeneratedPost {
  posterUrl?: string
  copy: string
  hashtags: string[]
}

// ── 非同步任務（圖生影）──
// 狀態值對齊後端影片任務狀態機（pending → processing → done → failed）；
// 舊版前端用 succeeded，跟後端對不上會導致輪詢永遠等不到「完成」。
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'
export type VideoModelTier = 'standard' | 'advanced' | 'pro'
export const VIDEO_MODEL_TIERS: { key: VideoModelTier; label: string; multiplier: number }[] = [
  { key: 'standard', label: '標準', multiplier: 1 },
  { key: 'advanced', label: '進階', multiplier: 2 },
  { key: 'pro', label: '專業', multiplier: 4 },
]
export interface VideoJobReq {
  sourceImageId?: string
  template: string
  ratio: string
  modelTier: VideoModelTier
}
export interface VideoJob {
  id: string
  status: JobStatus
  progress: number // 0..100，由後端任務狀態 API 回傳
  cost: number
  resultUrl?: string
  error?: string
}

// ── 背景生成任務（跨頁面，圖生圖／圖生影共用；驅動頂部工具列「任務」按鈕與任務中心面板）──
export type GenerationTaskKind = 'image' | 'video'
// 圖生圖任務也共用這個型別（純前端內部概念，沒有對應的後端輪詢端點），
// 但值域跟著 JobStatus 一起改，兩者目前是同一組字面值、指派時才不會型別對不上。
export type GenerationTaskStatus = 'pending' | 'processing' | 'done' | 'failed'
export interface GenerationTask {
  id: string
  kind: GenerationTaskKind
  name: string
  status: GenerationTaskStatus
  progress: number // 0..100
  cost: number
  error?: string
  read: boolean // 完成／失敗後使用者是否已在任務中心看過
  createdAt: number
  doneAt?: number
  resultImages?: GeneratedImage[] // kind === 'image' 才有
  videoReq?: VideoJobReq // kind === 'video' 才有；保留原始請求供「重試」使用
}

// ── 試穿 ──
export interface TryOnReq {
  modelRef: string // 內建模特 id 或上傳 id
  apparelId?: string
}

// ── 用量與指標 ──
export interface UsageSummary {
  used: number
  remaining: number
  monthlyLimit: number
  percent: number
  generatedThisMonth: number // 本月已生成張數（首頁統計用）
  daily: number[]
  byModule: { label: string; value: number; color: string }[]
}
export interface Metrics {
  successRate: number
  adoptionRate: number
  avgRegen: number
  costPerAdopted: number
}

// ── 品牌設定 ──
export interface BrandProfile {
  name: string
  positioning: string
  website: string
  industry: string
  colors: { label: string; hex: string }[]
  tones: string[]
  hashtags: string[]
  addressing: string
  avoidWords: string
  logoName?: string // Logo 檔名（顯示用）
  logoUrl?: string // Logo 圖片來源（mock 為 data URL；後端就緒後改存 R2 URL）
  /** 肖像權同意條款模板（合規頁）；對齊後端 portraitConsentTemplate */
  portraitConsent: string
  /** 圖片授權／使用聲明（合規頁）；對齊後端 imageLicense */
  imageLicense: string
}

// ── 圖片編輯與 AI 修圖（MV-09 / MV-09b）──
export type EditorToolKey = 'remove' | 'object' | 'fade' | 'text' | 'crop'
export type RetouchOptionKey = 'removeObjects' | 'repair' | 'lighting' | 'upscale'
export type RetouchMethod = 'quick' | 'command'

/** 編輯器價目表。前端不得自行寫死金額，一律以這份為準 */
export interface EditorPricing {
  /** 編輯畫布各工具的單次成本；0 代表不扣飼料 */
  tools: Record<EditorToolKey, number>
  /** AI 修圖各修飾項目的成本 */
  retouchOptions: Record<RetouchOptionKey, number>
  /** 指令式修圖的基本費 */
  commandBase: number
}

/** 編輯畫布套用一次 AI 工具的結果（成本由後端算，不信任前端傳來的金額） */
export interface AppliedEditTool {
  tool: EditorToolKey
  cost: number
}

export interface RetouchReq {
  method: RetouchMethod
  options: RetouchOptionKey[]
  instruction?: string
}

export interface RetouchResult {
  method: RetouchMethod
  /** 後端實際採用的項目（會濾掉與該修圖方式不相符的選項） */
  options: RetouchOptionKey[]
  cost: number
}

export type AdoptionKind = 'download' | 'save'

// ── 登入／帳號 ──
export interface LoginReq {
  username: string
  password: string
}
export interface RegisterReq {
  username: string
  password: string
}
export interface Session {
  username: string
  displayName: string
  /** 後端簽發的存取憑證。假後端模式下為空字串——空的就不會送出 Authorization */
  token: string
  /** 目前操作的機器人；每支 bot-scoped API 都要帶（`X-Bot-Id`） */
  botId: string
  /** 後端回的角色（開帳號的人是 `admin`） */
  role: string
  /**
   * 憑證到期的**絕對時間**（毫秒）。後端回的是剩餘秒數，這裡換算成絕對時間，
   * 重新整理後才判斷得出來還有沒有效——憑證沒有續期機制，過期就是要重新登入。
   */
  expiresAt: number
}

export type {
  Asset,
  BatchResult,
  Bot,
  Folder,
  FolderListResponse,
  ImageCounts,
  ImageListQuery,
  ImageListResponse,
  Material,
  MaterialListResponse,
}
