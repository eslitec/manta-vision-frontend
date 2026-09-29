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

// ── AI 模型與價格（GET /ai-models；欄位同後端 AIModelResponse）──
export type AiModelType = 'image' | 'edit' | 'video' | 'tryon' | 'marketing'
export interface AiModel {
  modelKey: string // 例：imageStandard／imageAdvanced／imagePro／marketingImage／marketingText
  name: string
  modelType: AiModelType
  costFeeds: number // 每次（圖生圖為每張）飼料成本，一律以後端為準
}

// ── 生成請求／結果 ──
// 欄位名等於後端 GenerateRequest，real 版整包當 body 送出
export interface GenerateImageReq {
  modelKey: string
  imageId?: string // 選填（後端 v14）：帶＝圖生圖；不帶＝純文字生圖（同檔位同單價，輸出固定 1024×1024）
  prompt: string
  count: number // 1～4；帶 regenOf 時後端視為 1
  strength?: number // 後端語意 0..1：越低越貼近參考圖（畫面上的「參考強度」要翻轉後再送）；沒有 imageId 時不送
  negativePrompt?: string // 負面提示：不希望出現的元素
  seed?: number // 種子；未指定＝隨機（固定可重現同一張）
  useBrand: boolean
  regenOf?: string // 重新生成：原張的 resultId
}
export interface GeneratedImage {
  id: string // = 後端 resultId
  generationId: string
  url: string // 後端 tempUrl，只暫存 24 小時，不可持久化；mock 為 ''
  adopted: boolean // 是否已採用（下載或存入圖庫）
  savedAssetId?: string // 存入圖庫後的素材 id
}
/** 指到某次生成的某一張結果：存入圖庫與採用事件都用它，呼叫端直接傳 GeneratedImage */
export type GenerationRef = Pick<GeneratedImage, 'id' | 'generationId'>

// 輸出內容類型：文案＋配圖／只要文案／只要配圖；價格讀 GET /ai-models?modelType=marketing
export type PostOutputType = 'both' | 'textOnly' | 'imageOnly'
export interface GeneratePostReq {
  outputType: PostOutputType
  useBrand: boolean // 套用品牌設定（由後端依 bot_id 讀取）
  // 以下四欄「要配圖時」必填（POST /marketing/image）
  imageId?: string // 商品圖
  posterText?: string // 印在海報上的字（1～200）
  ratio?: string // '1:1'｜'16:9'｜'9:16'
  inspirationId?: string // 選填：版型與色調參考
  // 「要文案時」必填（POST /marketing/text）
  productDesc?: string // 寫貼文用的商品介紹（1～200）
}
export interface GeneratedPost {
  poster?: GeneratedImage
  copy?: string
  hashtags: string[]
  partialError?: unknown // 「文案＋配圖」只有一半失敗時，放失敗那一半的錯誤
}

// ── 靈感素材（GET /inspirations）──
export interface Inspiration {
  id: string
  name: string
  url: string
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

// ── 背景生成任務（跨頁面，圖生圖／圖生影／行銷 PO 文／AI 試穿／AI 修圖共用；驅動頂部工具列「任務」按鈕與任務中心面板）──
// 行銷 PO 文一半一種：marketingImage＝配圖、marketingText＝文案（名稱對齊後端 modelKey）；tryon＝AI 試穿、retouch＝AI 修圖
export type GenerationTaskKind = 'image' | 'video' | 'marketingImage' | 'marketingText' | 'tryon' | 'retouch'
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
  videoReq?: VideoJobReq // kind === 'video' 才有；保留原始請求供「重試」使用
}

// ── 試穿（POST /tryon）──
// 欄位名等於後端 TryonRequest，real 版整包當 body；無 prompt、無 useBrand、無 modelKey（模型固定、試穿不做品牌介入）
export interface TryOnReq {
  modelSource: 'material' | 'upload' // material＝內建模特庫；upload＝使用者上傳的模特照（source=tryonModel）
  modelRefId: string // material 時＝materialId；upload 時＝該模特照的 imageId
  clothImageId: string // 服飾素材：這隻機器人任一張圖
}

// ── 錢包、用量與指標（GET /feeds、GET /feeds/usage、GET /metrics）──
// 欄位名等於後端 schemas/feed.py、schemas/period.py、schemas/metrics.py，real 版原樣回傳
export interface FeedSummary {
  balance: number
  monthlyLimit: number | null // null＝無上限
  monthUsed: number // 台北日曆月內已結清的支出（顆）
  estImages: number // 依餘額與最便宜檔位估的可生成張數／支數
  estVideos: number
}
export type UsagePeriod = 'month' | '30d' | '90d' | 'custom'
export interface PeriodParams {
  period: UsagePeriod
  startDate?: string // custom 必填，YYYY-MM-DD
  endDate?: string // custom 必填；含頭含尾，跨度 ≤ 366 天
  timezone?: string // IANA；後端對 month 一律用 Asia/Taipei
}
export interface UsageQuery extends PeriodParams {
  groupBy: 'day' | 'module'
}
export interface UsageModule {
  type: string // generate／marketingImage／marketingText／video／tryon
  used: number
  sharePct: number
  vsLastMonthPct: number | null // 與前一個等長區間比；前期 0 → null
  avgPerGen: number
}
export interface UsageSummary {
  period: { from: string; to: string }
  totalUsed: number
  dailyAvg: number
  vsLastMonthPct: number | null
  byModule: UsageModule[] | null // groupBy=module 才有
  daily: { date: string; used: number }[] | null // groupBy=day 才有；缺日由後端補 0
}
export interface MetricValues {
  successRate: number | null // 分母 0 → null
  adoptionRate: number | null
  avgRegenerate: number | null
  costPerAdopted: number | null
}
export interface Metrics extends MetricValues {
  period: { from: string; to: string }
  vsLastPeriod: MetricValues // 絕對差：百分點／次／顆
  monthGenerated: number
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

/** 編輯畫布價目表。前端不得自行寫死金額，一律以這份為準（AI 修圖單價改讀 GET /ai-models?modelType=edit） */
export interface EditorPricing {
  /** 編輯畫布各工具的單次成本；0 代表不扣飼料 */
  tools: Record<EditorToolKey, number>
}

/** 編輯畫布套用一次 AI 工具的結果（成本由後端算，不信任前端傳來的金額） */
export interface AppliedEditTool {
  tool: EditorToolKey
  cost: number
}

// POST /edit（multipart）：快速修飾只送 options、指令修圖只送 instruction（→ 後端 prompt），兩者至少一個
export interface RetouchReq {
  imageId: string // 要修的圖庫素材（後端只收本 bot 的 images，內建素材會 404）
  method: RetouchMethod
  options: RetouchOptionKey[]
  instruction?: string
}

/** 修圖結果＝results[0]（後端固定一張，tempUrl 只暫存 24 小時），可直接拿去存入圖庫／下載 */
export interface RetouchResult extends GeneratedImage {
  method: RetouchMethod
  options: RetouchOptionKey[]
  cost: number // 後端實際扣的顆數（costFeeds）
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

// ── 飼料儲值（MV「儲值」彈窗，mock-only）──
// 套餐識別碼；套餐的顆數與顯示文字定義在 TopUpDialog.vue 的常數陣列，這裡只約束 id 格式。
export type FeedPackageId = 'pkg-500' | 'pkg-1500' | 'pkg-3000'
/**
 * 模擬儲值：輸入套餐 id，回傳更新後的飼料餘額。
 * 只在 `src/api/mock.ts` 實作；`realApi` 明確設成 `undefined`，真後端模式一律走 TopUpDialog 的
 * 「不支援」分支。後端雖有 `POST /feeds/topup`，但那是不收錢的模擬儲值，要不要接等產品確認
 * （openspec/changes/generation-real-backend design.md「真後端模式停用模擬儲值」）。
 * 呼叫端一律用 `api.topUpFeed?.(...)` 選擇性呼叫。
 */
export type TopUpFeedFn = (packageId: string) => Promise<{ balance: number }>

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
