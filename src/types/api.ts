import type { Asset } from './asset'

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

// 輸出內容類型：文案＋配圖／只要文案／只要配圖，三者飼料成本不同（見 MarketingPostView OUTPUT_TYPE_OPTIONS）
export type PostOutputType = 'both' | 'textOnly' | 'imageOnly'
export interface GeneratePostReq {
  productImageId?: string // 商品圖＝產圖時的「錨」（去背後合成，商品本身不被改）
  intro: string // 商品描述＝主題來源
  applyBrand: boolean // 套用品牌設定（色票／Logo／語氣，由後端依 bot_id 讀取）
  ratio?: string // 版位比例（'1:1'｜'4:5'｜'9:16'｜'16:9'），影響構圖與輸出
  outputType: PostOutputType // 輸出內容類型；決定回傳內容與扣款數（5／2／3 顆）
}
export interface GeneratedPost {
  posterUrl?: string
  copy: string
  hashtags: string[]
}

// ── 非同步任務（圖生影）──
export type JobStatus = 'pending' | 'processing' | 'succeeded' | 'failed'
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
export type GenerationTaskStatus = 'pending' | 'processing' | 'succeeded' | 'failed'
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
export interface Session {
  username: string
  displayName: string
}

export type { Asset }

// ── 飼料儲值（MV「儲值」彈窗，mock-only）──
// 套餐識別碼；套餐的顆數與顯示文字定義在 TopUpDialog.vue 的常數陣列，這裡只約束 id 格式。
export type FeedPackageId = 'pkg-500' | 'pkg-1500' | 'pkg-3000'
/**
 * 模擬儲值：輸入套餐 id，回傳更新後的飼料餘額。
 * 只在 `src/api/mock.ts` 實作，`src/api/real.ts` 不新增對應實作（真後端目前沒有付款端點，
 * 見 openspec/changes/add-feed-topup-dialog design.md 決策 5）——呼叫端一律用
 * `api.topUpFeed?.(...)` 選擇性呼叫，避免真後端環境下呼叫到不存在的方法。
 */
export type TopUpFeedFn = (packageId: string) => Promise<{ balance: number }>
