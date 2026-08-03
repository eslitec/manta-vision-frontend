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
export type JobStatus = 'queued' | 'processing' | 'done' | 'failed'
export interface VideoJobReq {
  sourceImageId?: string
  template: string
  ratio: string
}
export interface VideoJob {
  id: string
  status: JobStatus
  cost: number
  resultUrl?: string
  error?: string
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

export type AdoptionKind = 'download' | 'save'

export type { Asset }
