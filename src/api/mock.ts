import type {
  AiModel,
  AppliedEditTool,
  Asset,
  BrandProfile,
  EditorPricing,
  EditorToolKey,
  GeneratedImage,
  GeneratedPost,
  GenerateImageReq,
  GeneratePostReq,
  Metrics,
  RetouchReq,
  RetouchResult,
  Session,
  UsageSummary,
  VideoJob,
  VideoJobReq,
} from '@/types/api'
import { VIDEO_MODEL_TIERS } from '@/types/api'
import { UNFILED_FOLDER } from '@/types/asset'

// ⚠️ 這是「假後端」：所有資料在記憶體中，讓前端功能可端到端運作。
// 之後把每個函式改成呼叫 http（api/http.ts）即可，介面不變。

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms))
let seq = 100
const uid = (p: string) => `${p}_${++seq}`

const db = {
  feedBalance: 1240,
  monthlyUsed: 3760,
  monthlyLimit: 5000,
  // 指標用計數
  totalGen: 128, // 全模組生成數（成功率分母）
  imgGen: 110, // 只有圖生圖的生成數（採用率分母；採用只算圖生圖）
  adoptedGen: 88, // 圖生圖被採用（下載或存入圖庫）數
  successGen: 123,
  regenBeforeAdopt: 1.7,
  generatedThisMonth: 128, // 本月已生成張數（首頁統計；產圖的模組才計入）
  folders: ['未分類', '春季企劃', '商品素材', '生成結果'],
  assets: [
    {
      id: 'a1',
      name: '春季主視覺_01',
      source: '上傳',
      tag: 'upload',
      dim: '1024×758',
      folderId: '春季企劃',
      referencedBy: 2,
    },
    {
      id: 'a2',
      name: '商品_去背_白T',
      source: '物件素材',
      tag: 'object',
      dim: '1024×768',
      folderId: '商品素材',
      referencedBy: 1,
    },
    { id: 'a3', name: '生成_木質桌面情境', source: 'AI 生成', tag: 'ai', dim: '1024×768', folderId: '生成結果' },
    { id: 'a4', name: '春季主視覺_調色版', source: '編輯產物', tag: 'edit', dim: '1024×768', folderId: '春季企劃' },
    { id: 'a5', name: '門市外觀', source: '上傳', tag: 'upload', dim: '1024×768', folderId: '未分類' },
    {
      id: 'a6',
      name: '商品_去背_帆布袋',
      source: '物件素材',
      tag: 'object',
      dim: '1024×768',
      folderId: '商品素材',
      referencedBy: 1,
    },
    { id: 'a7', name: '生成_野餐情境', source: 'AI 生成', tag: 'ai', dim: '1024×768', folderId: '生成結果' },
    {
      id: 'a8',
      name: '夏季宣傳_短影片',
      source: '影片',
      tag: 'video',
      dim: '1080×1920',
      type: 'video',
      folderId: '生成結果',
    },
  ] as Asset[],
  brand: {
    name: '日安選物',
    positioning: '嚴選日常質感選物，讓生活有溫度',
    website: 'www.rihan-select.com',
    industry: 'apparel',
    colors: [
      { label: '主色', hex: '#2E3567' },
      { label: '輔色', hex: '#A5C8E6' },
      { label: '點綴色', hex: '#F2BB00' },
    ],
    tones: [],
    hashtags: ['#日安選物', '#選物日常', '#質感生活', '#OOTD'],
    addressing: '你',
    avoidWords: '',
    logoName: '',
    logoUrl: '',
  } as BrandProfile,
  consent: false,
  session: null as Session | null,
  jobs: new Map<
    string,
    { req: VideoJobReq; created: number; cost: number; failed?: boolean; failedChecked?: boolean }
  >(),
}

// 編輯器價目表（對齊 MV-09 工具列與 MV-09b 修飾項目的設計稿標價）
const EDITOR_PRICING: EditorPricing = {
  tools: { remove: 8, object: 0, fade: 0, text: 0, crop: 0 },
  retouchOptions: { removeObjects: 8, repair: 8, lighting: 0, upscale: 5 },
  commandBase: 16,
}
const COMMAND_RETOUCH_OPTIONS = ['lighting', 'upscale']

// demo-only credentials，mock 用；對齊 topbar 顯示的 Mavis／日安選物
const DEMO_USERNAME = 'mavis'
const DEMO_PASSWORD = 'mavis123'

function deduct(cost: number) {
  if (db.feedBalance < cost) throw new Error('INSUFFICIENT_FEED')
  db.feedBalance -= cost
  db.monthlyUsed += cost
}
export const mockApi = {
  // GET /models
  async listModels(): Promise<AiModel[]> {
    await delay(200)
    return [
      { id: 'nano-banana', name: 'Nano Banana', provider: 'Google Gemini 2.5 Flash Image', costPerImage: 4 },
      { id: 'flux-1', name: 'FLUX.1', provider: 'Black Forest Labs', costPerImage: 8 },
      { id: 'dalle-3', name: 'DALL·E 3', provider: 'OpenAI', costPerImage: 6 },
      { id: 'sdxl', name: 'Stable Diffusion XL', provider: 'Stability AI', costPerImage: 3 },
      { id: 'midjourney', name: 'Midjourney', provider: 'Midjourney v6', costPerImage: 8 },
      { id: 'ideogram', name: 'Ideogram 2.0', provider: 'Ideogram', costPerImage: 5 },
    ]
  },

  // GET /feed
  async getFeed() {
    await delay(150)
    return { balance: db.feedBalance }
  },

  // GET /images
  async listImages(): Promise<Asset[]> {
    await delay(250)
    return [...db.assets]
  },

  // GET /folders（使用者歸檔的資料夾，與「來源」是獨立維度）
  async listFolders(): Promise<string[]> {
    await delay(150)
    return [...db.folders]
  },

  // POST /folders（新增資料夾）
  async createFolder(name: string): Promise<string[]> {
    await delay(200)
    const n = name.trim()
    if (n && !db.folders.includes(n)) db.folders.push(n)
    return [...db.folders]
  },

  // PATCH /images/folders（把選取素材移至資料夾；1:N＝直接替換 folderId，會離開原資料夾）
  async moveToFolder(assetIds: string[], folder: string): Promise<void> {
    await delay(250)
    for (const a of db.assets) {
      if (assetIds.includes(a.id)) a.folderId = folder
    }
  },

  // PATCH /images/folders/remove（把選取素材移出目前資料夾；1:N＝folderId 設回未分類，素材仍保留在圖庫）
  async removeFromFolder(assetIds: string[]): Promise<void> {
    await delay(250)
    for (const a of db.assets) {
      if (assetIds.includes(a.id)) a.folderId = UNFILED_FOLDER
    }
  },

  // DELETE /images（批次刪除素材）
  async deleteImages(assetIds: string[]): Promise<void> {
    await delay(300)
    db.assets = db.assets.filter((a) => !assetIds.includes(a.id))
  },

  // POST /images (上傳) — 落到指定資料夾，未指定則進「未分類」
  async uploadImage(file: File, folder?: string): Promise<Asset> {
    await delay(400)
    // TODO: 後端就緒後把 file blob 上傳到 R2、回傳真實 URL 與尺寸；目前僅用檔名建立素材
    const a: Asset = {
      id: uid('a'),
      name: file.name,
      source: '上傳',
      tag: 'upload',
      dim: '1024×768',
      folderId: folder ?? UNFILED_FOLDER,
    }
    db.assets.unshift(a)
    return a
  },

  // GET /editor/pricing — 編輯器價目表（MV-09 工具列與 MV-09b 修飾項目共用同一份）
  async getEditorPricing(): Promise<EditorPricing> {
    await delay(120)
    return {
      tools: { ...EDITOR_PRICING.tools },
      retouchOptions: { ...EDITOR_PRICING.retouchOptions },
      commandBase: EDITOR_PRICING.commandBase,
    }
  },

  // POST /images/edit/tool — 編輯畫布套用一次 AI 工具，在執行當下就扣款。
  // 目前只有背景移除有價；加入物件／文字／淡化／裁切皆為 0，對齊設計稿的成本說明。
  async applyEditTool(tool: EditorToolKey): Promise<AppliedEditTool> {
    await delay(500)
    const cost = EDITOR_PRICING.tools[tool] ?? 0
    if (cost > 0) deduct(cost)
    return { tool, cost }
  },

  // POST /images/retouch — AI 修圖。成本一律由這裡依價目表計算，不採用前端傳來的金額。
  async retouchImage(req: RetouchReq): Promise<RetouchResult> {
    await delay(900)
    // 指令式修圖只開放光線校正與放大兩個加購項，其餘一律忽略
    const allowed = req.method === 'command' ? COMMAND_RETOUCH_OPTIONS : Object.keys(EDITOR_PRICING.retouchOptions)
    const options = req.options.filter((key) => allowed.includes(key))
    const cost =
      (req.method === 'command' ? EDITOR_PRICING.commandBase : 0) +
      options.reduce((total, key) => total + (EDITOR_PRICING.retouchOptions[key] ?? 0), 0)
    if (cost > 0) deduct(cost)
    return { method: req.method, options, cost }
  },

  // POST /images/edit（另存編輯產物，非破壞→新素材）
  // 另存本身不扣飼料——扣款發生在 applyEditTool／retouchImage 的執行當下。
  // opts.folder：使用者選定的存放位置（我的資料夾）；opts.keepLayers：是否保留可再編輯的圖層資訊
  async editImage(name: string, opts?: { folder?: string; keepLayers?: boolean }): Promise<Asset> {
    await delay(600)
    const a: Asset = {
      id: uid('a'),
      name,
      source: '編輯產物',
      tag: 'edit',
      dim: '1024×768',
      folderId: opts?.folder ?? UNFILED_FOLDER,
      editable: opts?.keepLayers ?? false,
    }
    db.assets.unshift(a)
    return a
  },

  // POST /prompt/enhance（AI 輔助描述：把口語擴寫成結構化 prompt）
  async enhancePrompt(text: string): Promise<string> {
    await delay(500)
    // TODO: 後端接 LLM（prompt enhancer）；此處為 mock，按結構補上常用修飾詞
    const base = text.trim()
    const extras = ['主體清晰', '自然光', '柔和陰影', '乾淨構圖', '日系簡約風格', '高解析、專業攝影']
    return base ? `${base}，${extras.join('、')}` : extras.join('、')
  },

  // POST /generate/image
  async generateImages(req: GenerateImageReq, costPerImage: number): Promise<GeneratedImage[]> {
    const cost = costPerImage * req.count
    deduct(cost)
    db.totalGen += req.count
    db.imgGen += req.count // 圖生圖才計入採用率分母
    db.generatedThisMonth += req.count
    db.successGen += req.count
    await delay(900)
    return Array.from({ length: req.count }, () => ({ id: uid('g'), adopted: false }))
  },

  // POST /generate/post（貼圖＋文案，一次扣一次）
  async generatePost(req: GeneratePostReq): Promise<GeneratedPost> {
    deduct(12)
    db.totalGen += 1
    db.generatedThisMonth += 1
    db.successGen += 1
    await delay(1000)
    const tags = req.applyBrand ? db.brand.hashtags.slice(0, 3) : ['#新品', '#日常']
    return {
      copy: '🌿 春天就是要換上最舒服的自己\n\n全新純棉系列，透氣不悶熱，五種溫柔色調任你搭配。現在下單享春夏限時 8 折，把好天氣穿在身上 ☀',
      hashtags: tags,
    }
  },

  // POST /generate/video → 建立非同步任務；扣款依生成模型倍率（標準×1／進階×2／專業×4）
  async createVideoJob(req: VideoJobReq): Promise<VideoJob> {
    const tier = VIDEO_MODEL_TIERS.find((t) => t.key === req.modelTier)
    const cost = 45 * (tier ? tier.multiplier : 1)
    deduct(cost)
    db.totalGen += 1
    const id = uid('job')
    db.jobs.set(id, { req, created: Date.now(), cost })
    await delay(300)
    return { id, status: 'pending', progress: 0, cost }
  },

  // GET /generate/video/:id → 查任務狀態（demo 用短時間模擬 1–2 分鐘；processing 階段有小機率模擬模型逾時失敗，讓失敗／重試／退款流程可被實際觸發與測試）
  async getVideoJob(id: string): Promise<VideoJob> {
    await delay(200)
    const j = db.jobs.get(id)
    if (!j) return { id, status: 'failed', progress: 0, cost: 0, error: 'NOT_FOUND' }
    if (j.failed) return { id, status: 'failed', progress: 0, cost: j.cost, error: 'MODEL_TIMEOUT' }
    const elapsed = Date.now() - j.created
    let status: VideoJob['status'] = 'pending'
    let progress = Math.min(10, Math.round((elapsed / 1500) * 10))
    if (elapsed > 5000) {
      status = 'succeeded'
      progress = 100
    } else if (elapsed > 1500) {
      status = 'processing'
      progress = Math.min(99, 10 + Math.round(((elapsed - 1500) / 3500) * 90))
      if (!j.failedChecked) {
        j.failedChecked = true
        if (Math.random() < 0.12) {
          j.failed = true
          return { id, status: 'failed', progress, cost: j.cost, error: 'MODEL_TIMEOUT' }
        }
      }
    }
    if (status === 'succeeded') {
      db.successGen += 1
      return { id, status, progress, cost: j.cost, resultUrl: 'mock://video' }
    }
    return { id, status, progress, cost: j.cost }
  },

  // POST /generate/tryon
  async tryOn(): Promise<{ ok: true }> {
    deduct(15)
    db.totalGen += 1
    db.generatedThisMonth += 1
    db.successGen += 1
    await delay(1000)
    return { ok: true }
  },

  // 存入圖庫（選用）→ 生成結果落地成 AI 生成素材，並記錄採用
  async saveGenerated(name: string): Promise<Asset> {
    await delay(300)
    const a: Asset = { id: uid('a'), name, source: 'AI 生成', tag: 'ai', dim: '1024×768', folderId: UNFILED_FOLDER }
    db.assets.unshift(a)
    return a
  },

  // 記錄採用（下載或存入圖庫皆算；同張只算一次由呼叫端去重）
  async recordAdoption(): Promise<void> {
    await delay(100)
    db.adoptedGen += 1
  },

  // GET /usage
  async getUsage(): Promise<UsageSummary> {
    await delay(300)
    const percent = Math.round((db.monthlyUsed / db.monthlyLimit) * 100)
    return {
      used: db.monthlyUsed,
      remaining: db.feedBalance,
      monthlyLimit: db.monthlyLimit,
      percent,
      generatedThisMonth: db.generatedThisMonth,
      daily: [22, 30, 26, 40, 52, 44, 58, 66, 60, 74, 82, 70, 92, 78],
      byModule: [
        { label: '圖生圖', value: 1580, color: '#467AE8' },
        { label: '行銷 PO 文', value: 920, color: '#7F77DD' },
        { label: '圖生影', value: 840, color: '#EA903A' },
        { label: 'AI 試穿', value: 420, color: '#54C14F' },
      ],
    }
  },

  // GET /metrics（採用率等只算圖生圖）
  async getMetrics(): Promise<Metrics> {
    await delay(300)
    return {
      // 成功率＝全模組；採用率／平均重生成／每採用成本＝只算圖生圖
      successRate: Math.round((db.successGen / Math.max(1, db.totalGen)) * 1000) / 10,
      adoptionRate: Math.round((db.adoptedGen / Math.max(1, db.imgGen)) * 1000) / 10,
      avgRegen: db.regenBeforeAdopt,
      costPerAdopted: 6.1,
    }
  },

  // GET /brand ・ PUT /brand
  async getBrand(): Promise<BrandProfile> {
    await delay(200)
    return JSON.parse(JSON.stringify(db.brand))
  },
  async saveBrand(profile: BrandProfile): Promise<void> {
    await delay(500)
    db.brand = JSON.parse(JSON.stringify(profile))
  },

  // GET /consent ・ POST /consent（肖像同意，全站一次生效）
  async getConsent(): Promise<{ consented: boolean }> {
    await delay(150)
    return { consented: db.consent }
  },
  async giveConsent(): Promise<void> {
    await delay(300)
    db.consent = true
  },

  // POST /auth/login
  async login(username: string, password: string): Promise<Session> {
    await delay(400)
    if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) throw new Error('INVALID_CREDENTIALS')
    const session: Session = { username, displayName: 'Mavis' }
    db.session = session
    return session
  },
  // POST /auth/logout
  async logout(): Promise<void> {
    await delay(150)
    db.session = null
  },
}
