import type {
  AiModel,
  AppliedEditTool,
  Asset,
  Bot,
  BrandProfile,
  EditorPricing,
  EditorToolKey,
  Folder,
  FolderListResponse,
  GeneratedImage,
  GeneratedPost,
  GenerateImageReq,
  GeneratePostReq,
  ImageCounts,
  ImageListQuery,
  ImageListResponse,
  Material,
  MaterialListResponse,
  Metrics,
  RetouchReq,
  RetouchResult,
  Session,
  UsageSummary,
  VideoJob,
  VideoJobReq,
} from '@/types/api'
import { VIDEO_MODEL_TIERS } from '@/types/api'

// ⚠️ 這是「假後端」：所有資料在記憶體中，讓前端功能可端到端運作。
// 之後把每個函式改成呼叫 http（api/http.ts）即可，介面不變。

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms))
let seq = 100
const uid = (p: string) => `${p}_${++seq}`

// demo-only credentials，mock 用；對齊 topbar 顯示的 Mavis／日安選物
// 假後端沒有真的憑證：token 留空，http 層就不會送出 Authorization。
// expiresAt 仍給合理的值，讓「還原時檢查過期」那段在兩種模式下都走得到。
const MOCK_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
function mockSession(username: string, displayName: string): Session {
  return {
    username,
    displayName,
    token: '',
    botId: '',
    role: 'admin',
    expiresAt: Date.now() + MOCK_SESSION_TTL_MS,
  }
}

const DEMO_USERNAME = 'mavis'
const DEMO_PASSWORD = 'mavis123'

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
  // 資料夾：id／顯示名稱兩個欄位，對齊後端 FolderResponse（imageCount 由 listFolders 即時算出，不在這裡存）
  folders: [
    { folderId: 'folder_spring', folderName: '春季企劃' },
    { folderId: 'folder_product', folderName: '商品素材' },
    { folderId: 'folder_result', folderName: '生成結果' },
  ],
  // 素材：source／type 對齊後端 ImageSource／MediaType 兩個獨立維度；
  // 未指定 folderId＝未分類（後端回 null，這裡用 undefined 表示）
  assets: [
    {
      id: 'a1',
      name: '春季主視覺_01',
      source: 'upload',
      dim: '1024×758',
      type: 'image',
      folderId: 'folder_spring',
      referencedBy: 2,
    },
    {
      id: 'a2',
      name: '商品_去背_白T',
      source: 'object',
      dim: '1024×768',
      type: 'image',
      folderId: 'folder_product',
      referencedBy: 1,
    },
    {
      id: 'a3',
      name: '生成_木質桌面情境',
      source: 'aiGenerate',
      dim: '1024×768',
      type: 'image',
      folderId: 'folder_result',
    },
    { id: 'a4', name: '春季主視覺_調色版', source: 'edit', dim: '1024×768', type: 'image', folderId: 'folder_spring' },
    { id: 'a5', name: '門市外觀', source: 'upload', dim: '1024×768', type: 'image' },
    {
      id: 'a6',
      name: '商品_去背_帆布袋',
      source: 'object',
      dim: '1024×768',
      type: 'image',
      folderId: 'folder_product',
      referencedBy: 1,
    },
    {
      id: 'a7',
      name: '生成_野餐情境',
      source: 'aiGenerate',
      dim: '1024×768',
      type: 'image',
      folderId: 'folder_result',
    },
    {
      id: 'a8',
      name: '夏季宣傳_短影片',
      source: 'aiGenerate',
      dim: '1080×1920',
      type: 'video',
      folderId: 'folder_result',
    },
  ] as Asset[],
  brand: {
    // name／positioning 故意留空：讓「品牌設定」頁進入時只顯示 placeholder，
    // 不要有預設寫死的文字讓人誤以為是已輸入的值（回應 review 對這兩個欄位的意見）
    name: '',
    positioning: '',
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
    // 對齊 zh-Hant.ts 的 brandSettings.defaults，讓假後端與真後端的初始畫面一致
    portraitConsent: '本人同意品牌方將所提供之照片用於 AI 試穿內容之生成與行銷用途…',
    imageLicense: '所有生成圖片僅供本品牌行銷使用，不得轉授權第三方。',
  } as BrandProfile,
  consent: false,
  session: null as Session | null,
  users: new Map<string, { password: string; displayName: string }>([
    [DEMO_USERNAME, { password: DEMO_PASSWORD, displayName: 'Mavis' }],
  ]),
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

function deduct(cost: number) {
  // 錯誤碼跟後端碼表對齊：INSUFFICIENT_FEEDS（有 S，複數形）
  if (db.feedBalance < cost) throw new Error('INSUFFICIENT_FEEDS')
  db.feedBalance -= cost
  db.monthlyUsed += cost
}

// 圖庫／資料夾常數，對齊後端 app/services/images.py、app/services/folders.py
const MAX_UPLOAD_MB = 10
const MAX_FOLDERS_PER_BOT = 200
const SUPPORTED_UPLOAD_FORMATS = ['jpg', 'jpeg', 'png', 'webp']

// 內建素材（GET /materials；不分機器人，全平台共用；model 類別後端也還是空的）
const MATERIALS: Material[] = [
  { materialId: 'mat_bg_1', materialName: '白色棚拍背景', category: 'background', url: '' },
  { materialId: 'mat_bg_2', materialName: '木質桌面情境', category: 'background', url: '' },
  { materialId: 'mat_obj_1', materialName: '春季花束', category: 'object', url: '' },
]

// 依 source／mediaType 兩個維度統計整個圖庫（不受目前查詢條件篩選；對齊後端 count_by_bucket）
function countByBucket(): ImageCounts {
  const counts: ImageCounts = { all: 0, upload: 0, aiGenerate: 0, edit: 0, object: 0, video: 0 }
  for (const a of db.assets) {
    counts.all += 1
    if (a.type === 'video') {
      counts.video += 1
      continue
    }
    // 後端把 tryon 併入 aiGenerate 桶（左側欄沒有「試穿」分類）
    const bucket = a.source === 'tryon' ? 'aiGenerate' : a.source
    counts[bucket] += 1
  }
  return counts
}

function folderById(folderId: string): Folder | undefined {
  const f = db.folders.find((x) => x.folderId === folderId)
  return f ? { ...f, imageCount: db.assets.filter((a) => a.folderId === f.folderId).length } : undefined
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

  // GET /images（對齊後端分頁：{ total, page, items, counts }；counts 是整個圖庫的統計，不受這裡的篩選影響）
  async listImages(query: ImageListQuery = {}): Promise<ImageListResponse> {
    await delay(250)
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 8
    const filtered = db.assets.filter((a) => {
      if (query.mediaType && a.type !== query.mediaType) return false
      if (query.source && a.source !== query.source) return false
      if (query.folderId === null && a.folderId !== undefined) return false
      if (typeof query.folderId === 'string' && a.folderId !== query.folderId) return false
      if (query.q && !a.name.includes(query.q)) return false
      return true
    })
    const start = (page - 1) * pageSize
    return {
      total: filtered.length,
      page,
      items: filtered.slice(start, start + pageSize),
      counts: countByBucket(),
    }
  },

  // GET /folders（使用者歸檔的資料夾，與「來源」是獨立維度；imageCount 即時算出）
  async listFolders(): Promise<FolderListResponse> {
    await delay(150)
    return {
      items: db.folders.map((f) => ({
        ...f,
        imageCount: db.assets.filter((a) => a.folderId === f.folderId).length,
      })),
      unfiledCount: db.assets.filter((a) => a.folderId === undefined).length,
    }
  },

  // POST /folders（新增資料夾；名稱大小寫敏感去重、數量上限對齊後端）
  async createFolder(name: string): Promise<Folder> {
    await delay(200)
    const n = name.trim()
    if (db.folders.some((f) => f.folderName === n)) throw new Error('DUPLICATE_NAME')
    if (db.folders.length >= MAX_FOLDERS_PER_BOT) throw new Error('FOLDER_LIMIT_EXCEEDED')
    const folder = { folderId: uid('folder'), folderName: n }
    db.folders.push(folder)
    return { ...folder, imageCount: 0 }
  },

  // PUT /folders/:id（重新命名；同上去重規則）
  async renameFolder(folderId: string, name: string): Promise<Folder> {
    await delay(200)
    const n = name.trim()
    const folder = db.folders.find((f) => f.folderId === folderId)
    if (!folder) throw new Error('NOT_FOUND')
    if (db.folders.some((f) => f.folderId !== folderId && f.folderName === n)) throw new Error('DUPLICATE_NAME')
    folder.folderName = n
    return folderById(folderId)!
  },

  // DELETE /folders/:id（刪除資料夾；夾內素材移回未分類，不會被刪除）
  async deleteFolder(folderId: string): Promise<{ deleted: boolean; imagesUnfiled: number }> {
    await delay(250)
    const before = db.folders.length
    db.folders = db.folders.filter((f) => f.folderId !== folderId)
    if (db.folders.length === before) throw new Error('NOT_FOUND')
    let imagesUnfiled = 0
    for (const a of db.assets) {
      if (a.folderId === folderId) {
        a.folderId = undefined
        imagesUnfiled += 1
      }
    }
    return { deleted: true, imagesUnfiled }
  },

  // PUT /images/:id（改名／搬資料夾共用一支；folderId 三態：不帶這個 key＝不動，null＝移出未分類，字串＝搬過去）
  async updateImage(imageId: string, patch: { name?: string; folderId?: string | null }): Promise<Asset> {
    await delay(200)
    const a = db.assets.find((x) => x.id === imageId)
    if (!a) throw new Error('NOT_FOUND')
    if (patch.name !== undefined) a.name = patch.name.trim().slice(0, 100) || a.name
    if ('folderId' in patch) a.folderId = patch.folderId ?? undefined
    return { ...a }
  },

  // DELETE /images/:id（單筆刪除；被引用中的素材後端會擋下）
  async deleteImage(imageId: string): Promise<{ deleted: boolean }> {
    await delay(200)
    const a = db.assets.find((x) => x.id === imageId)
    if (!a) throw new Error('NOT_FOUND')
    if ((a.referencedBy ?? 0) > 0) throw new Error('ASSET_IN_USE')
    db.assets = db.assets.filter((x) => x.id !== imageId)
    return { deleted: true }
  },

  // POST /upload（上傳；落到指定資料夾，未指定則進「未分類」）
  async uploadImage(file: File, folderId?: string): Promise<Asset> {
    await delay(400)
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error('FILE_TOO_LARGE')
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!SUPPORTED_UPLOAD_FORMATS.includes(extension)) throw new Error('UNSUPPORTED_FORMAT')
    // TODO: 後端就緒後把 file blob 上傳到 R2、回傳真實 URL 與尺寸；目前僅用檔名建立素材
    const a: Asset = {
      id: uid('a'),
      name: file.name,
      source: 'upload',
      dim: '1024×768',
      type: 'image',
      folderId,
    }
    db.assets.unshift(a)
    return a
  },

  // GET /materials（內建素材；不分機器人）
  async listMaterials(category?: Material['category']): Promise<MaterialListResponse> {
    await delay(150)
    return { items: category ? MATERIALS.filter((m) => m.category === category) : [...MATERIALS] }
  },

  // GET /bots（目前一帳號一 bot，契約上一律回陣列）
  async listBots(): Promise<Bot[]> {
    await delay(150)
    return [{ botId: 'bot_demo', botName: '日安選物' }]
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
      source: 'edit',
      dim: '1024×768',
      type: 'image',
      folderId: opts?.folder || undefined,
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
      status = 'done'
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
    if (status === 'done') {
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
    const a: Asset = { id: uid('a'), name, source: 'aiGenerate', dim: '1024×768', type: 'image' }
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
  async saveBrand(profile: BrandProfile): Promise<BrandProfile> {
    await delay(500)
    db.brand = JSON.parse(JSON.stringify(profile))
    // 真後端 PUT /brand 會回存檔後的完整物件（例如 Logo 換成真正的 R2 網址）；
    // 假後端沒有這種轉換，但介面要一致，才不會兩邊呼叫端寫法不同
    return JSON.parse(JSON.stringify(db.brand))
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
    const user = db.users.get(username)
    if (!user || user.password !== password) throw new Error('INVALID_CREDENTIALS')
    const session = mockSession(username, user.displayName)
    db.session = session
    return session
  },
  // POST /auth/logout
  async logout(): Promise<void> {
    await delay(150)
    db.session = null
  },
  // POST /auth/register
  async register(username: string, password: string): Promise<Session> {
    await delay(400)
    if (db.users.has(username)) throw new Error('USERNAME_TAKEN')
    db.users.set(username, { password, displayName: username })
    const session = mockSession(username, username)
    db.session = session
    return session
  },
}
