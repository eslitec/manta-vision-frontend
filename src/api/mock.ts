import type {
  AiModel,
  AiModelType,
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
  FeedSummary,
  GeneratePostReq,
  GenerationRef,
  ImageCounts,
  ImageListQuery,
  ImageListResponse,
  Inspiration,
  Material,
  MaterialListResponse,
  Metrics,
  PeriodParams,
  RetouchReq,
  RetouchResult,
  Session,
  TryOnReq,
  UsageQuery,
  UsageSummary,
  VideoJob,
  VideoJobReq,
} from '@/types/api'
import type { UploadSource } from '@/types/asset'
import { VIDEO_MODEL_TIERS } from '@/types/api'
import { formatDimensions } from '@/utils/dimensions'

// ⚠️ 這是「假後端」：所有資料在記憶體中，讓前端功能可端到端運作。
// 之後把每個函式改成呼叫 http（api/http.ts）即可，介面不變。

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms))

// 期間參數 → 含頭含尾的本地日期區間（同後端 period.py 的語意：month 是日曆月、30d／90d 是滾動區間）
function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(y, m - 1, d + days))
}
function daysBetween(from: string, to: string) {
  return Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1)
}
function periodWindow(params: PeriodParams): { from: string; to: string } {
  const today = isoDate(new Date())
  if (params.period === 'custom') return { from: params.startDate ?? today, to: params.endDate ?? today }
  if (params.period === 'month') return { from: today.slice(0, 8) + '01', to: today }
  return { from: addDays(today, 1 - (params.period === '30d' ? 30 : 90)), to: today }
}
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
      dim: '1024×768',
      width: 1024,
      height: 768,
      type: 'image',
      folderId: 'folder_spring',
      referencedBy: 2,
      // 底圖與物件都給一張真圖（比照試穿模特的 picsum），mock 模式才走得到「物件圖層真的顯示、
      // 另存合成上傳」這條路徑；其他素材維持沒有 url、退回佔位圖示
      url: 'https://picsum.photos/seed/mvspring1/1024/768',
    },
    {
      id: 'a2',
      name: '商品_去背_白T',
      source: 'object',
      dim: '1024×768',
      width: 1024,
      height: 768,
      type: 'image',
      folderId: 'folder_product',
      referencedBy: 1,
      url: 'https://picsum.photos/seed/mvobj1/400/400',
    },
    {
      id: 'a3',
      name: '生成_木質桌面情境',
      source: 'aiGenerate',
      dim: '1024×768',
      width: 1024,
      height: 768,
      type: 'image',
      folderId: 'folder_result',
    },
    {
      id: 'a4',
      name: '春季主視覺_調色版',
      source: 'edit',
      dim: '1024×768',
      width: 1024,
      height: 768,
      type: 'image',
      folderId: 'folder_spring',
    },
    { id: 'a5', name: '門市外觀', source: 'upload', dim: '1024×768', width: 1024, height: 768, type: 'image' },
    {
      id: 'a6',
      name: '商品_去背_帆布袋',
      source: 'object',
      dim: '1024×768',
      width: 1024,
      height: 768,
      type: 'image',
      folderId: 'folder_product',
      referencedBy: 1,
      url: 'https://picsum.photos/seed/mvobj2/400/400',
    },
    {
      id: 'a7',
      name: '生成_野餐情境',
      source: 'aiGenerate',
      dim: '1024×768',
      width: 1024,
      height: 768,
      type: 'image',
      folderId: 'folder_result',
    },
    {
      id: 'a8',
      name: '夏季宣傳_短影片',
      source: 'aiGenerate',
      dim: '1080×1920',
      width: 1080,
      height: 1920,
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
  // 已採用（存入圖庫或下載）的結果，key 為 generationId/resultId：模擬後端「同一張只算一次採用」
  adoptedResults: new Set<string>(),
  // 圖生圖的 generationId：採用率只算 type='generate'（後端 metrics_calc），行銷海報的下載不計
  imageGenerations: new Set<string>(),
  // 修圖的 generationId：存入圖庫時同後端標 source=edit
  editGenerations: new Set<string>(),
  jobs: new Map<
    string,
    { req: VideoJobReq; created: number; cost: number; failed?: boolean; failedChecked?: boolean }
  >(),
}

// 編輯畫布價目表（對齊 MV-09 工具列的設計稿標價）；AI 修圖改讀 MOCK_MODELS 的 imageEdit
const EDITOR_PRICING: EditorPricing = {
  tools: { remove: 8, object: 0, fade: 0, text: 0, crop: 0 },
}

// 價格對齊後端 ai_models（migration 20260910b／20260910c）；真後端一律讀 GET /ai-models
const MOCK_MODELS: AiModel[] = [
  { modelKey: 'imageStandard', name: '標準', modelType: 'image', costFeeds: 8 },
  { modelKey: 'imageAdvanced', name: '進階', modelType: 'image', costFeeds: 12 },
  { modelKey: 'imagePro', name: '專業', modelType: 'image', costFeeds: 24 },
  { modelKey: 'marketingImage', name: '行銷海報圖', modelType: 'marketing', costFeeds: 5 },
  { modelKey: 'marketingText', name: '行銷文案', modelType: 'marketing', costFeeds: 0 },
  { modelKey: 'tryonStandard', name: '標準', modelType: 'tryon', costFeeds: 12 },
  { modelKey: 'imageEdit', name: '修圖', modelType: 'edit', costFeeds: 8 },
]
const priceOf = (modelKey: string) => MOCK_MODELS.find((m) => m.modelKey === modelKey)?.costFeeds

// 後端的採用＝存入圖庫或下載過，同一張只算一次
function markAdopted(from: GenerationRef) {
  const key = `${from.generationId}/${from.id}`
  if (!db.imageGenerations.has(from.generationId) || db.adoptedResults.has(key)) return
  db.adoptedResults.add(key)
  db.adoptedGen += 1
}

function deduct(cost: number) {
  // 錯誤碼跟後端碼表對齊：INSUFFICIENT_FEEDS（有 S，複數形）
  if (db.feedBalance < cost) throw new Error('INSUFFICIENT_FEEDS')
  db.feedBalance -= cost
  db.monthlyUsed += cost
}

// 儲值套餐顆數對照（id 對齊 TopUpDialog.vue 的套餐常數陣列／FeedPackageId）；
// mock-only，真後端目前沒有付款端點，見 add-feed-topup-dialog design.md 決策 5
const FEED_TOPUP_AMOUNTS: Record<string, number> = {
  'pkg-500': 500,
  'pkg-1500': 1500,
  'pkg-3000': 3000,
}

// 圖庫／資料夾常數，對齊後端 app/services/images.py、app/services/folders.py
const MAX_UPLOAD_MB = 10
const MAX_FOLDERS_PER_BOT = 200
// 選圖彈窗的檔案選擇 accept 也用這一份（picker-direct-upload design.md 決策 5）
export const SUPPORTED_UPLOAD_FORMATS = ['jpg', 'jpeg', 'png', 'webp']

// 內建素材（GET /materials；不分機器人，全平台共用）
// model 類別：真後端目前仍是空的（見 proposal.md Non-Goals），這裡先補上 mock 資料
// 讓 AI 試穿工作台「內建模特庫」的 Swiper 輪播本機開發／測試時有超過 4 筆真實素材可顯示。
const MATERIALS: Material[] = [
  { materialId: 'mat_bg_1', materialName: '白色棚拍背景', category: 'background', url: '', width: 1024, height: 768 },
  { materialId: 'mat_bg_2', materialName: '木質桌面情境', category: 'background', url: '', width: 1024, height: 768 },
  { materialId: 'mat_obj_1', materialName: '春季花束', category: 'object', url: '', width: 1024, height: 768 },
  {
    materialId: 'mat_model_1',
    materialName: '女·休閒',
    category: 'model',
    url: 'https://picsum.photos/seed/mvmodel1/400/500',
    width: 400,
    height: 500,
  },
  {
    materialId: 'mat_model_2',
    materialName: '男·正裝',
    category: 'model',
    url: 'https://picsum.photos/seed/mvmodel2/400/500',
    width: 400,
    height: 500,
  },
  {
    materialId: 'mat_model_3',
    materialName: '女·運動',
    category: 'model',
    url: 'https://picsum.photos/seed/mvmodel3/400/500',
    width: 400,
    height: 500,
  },
  {
    materialId: 'mat_model_4',
    materialName: '女·優雅',
    category: 'model',
    url: 'https://picsum.photos/seed/mvmodel4/400/500',
    width: 400,
    height: 500,
  },
  {
    materialId: 'mat_model_5',
    materialName: '男·休閒',
    category: 'model',
    url: 'https://picsum.photos/seed/mvmodel5/400/500',
    width: 400,
    height: 500,
  },
  {
    materialId: 'mat_model_6',
    materialName: '女·街頭',
    category: 'model',
    url: 'https://picsum.photos/seed/mvmodel6/400/500',
    width: 400,
    height: 500,
  },
]

// 內建素材投影成圖庫素材（對齊後端 GET /images 把全域 materials 合併進來的形狀）：
// id＝materialId、source='builtin'、沒有資料夾、不可被引用、一律是圖片
function materialAsAsset(m: Material): Asset {
  return {
    id: m.materialId,
    name: m.materialName,
    source: 'builtin',
    dim: formatDimensions(m.width, m.height),
    width: m.width ?? undefined,
    height: m.height ?? undefined,
    type: 'image',
    url: m.url,
    category: m.category,
  }
}

// 依 source／mediaType 兩個維度統計整個圖庫（不受目前查詢條件篩選；對齊後端 count_by_bucket）
// all 含內建素材、object 含內建的物件類素材
function countByBucket(): ImageCounts {
  const counts: ImageCounts = { all: 0, upload: 0, aiGenerate: 0, edit: 0, object: 0, video: 0, builtin: 0 }
  for (const m of MATERIALS) {
    counts.all += 1
    counts.builtin += 1
    if (m.category === 'object') counts.object += 1
  }
  for (const a of db.assets) {
    counts.all += 1
    if (a.type === 'video') {
      counts.video += 1
      continue
    }
    // 後端把 tryon 併入 aiGenerate 桶、模特照併入 upload 桶（左側欄沒有這兩個分類）
    const bucket = a.source === 'tryon' ? 'aiGenerate' : a.source === 'tryonModel' ? 'upload' : a.source
    counts[bucket] += 1
  }
  return counts
}

function folderById(folderId: string): Folder | undefined {
  const f = db.folders.find((x) => x.folderId === folderId)
  return f ? { ...f, imageCount: db.assets.filter((a) => a.folderId === f.folderId).length } : undefined
}

export const mockApi = {
  // GET /ai-models（同類型由便宜到貴）
  async listModels(modelType?: AiModelType): Promise<AiModel[]> {
    await delay(200)
    return MOCK_MODELS.filter((m) => !modelType || m.modelType === modelType)
  },

  // GET /feeds（估算用固定單價 8／45；真後端依 ai_models 最便宜檔位算）
  async getFeed(): Promise<FeedSummary> {
    await delay(150)
    return {
      balance: db.feedBalance,
      monthlyLimit: db.monthlyLimit,
      monthUsed: db.monthlyUsed,
      estImages: Math.floor(db.feedBalance / 8),
      estVideos: Math.floor(db.feedBalance / 45),
    }
  },

  // POST /feed/topup（mock-only：模擬儲值，見 add-feed-topup-dialog design.md 決策 5）
  async topUpFeed(packageId: string): Promise<{ balance: number }> {
    await delay(150)
    const amount = FEED_TOPUP_AMOUNTS[packageId]
    if (!amount) throw new Error('INVALID_PACKAGE')
    db.feedBalance += amount
    return { balance: db.feedBalance }
  },

  // GET /images（對齊後端分頁：{ total, page, items, counts }；counts 是整個圖庫的統計，不受這裡的篩選影響）
  // 不帶 source ＝ 使用者的圖 ∪ 內建素材（內建排在後面，對齊後端 createdAt DESC、內建素材最舊）；
  // source=builtin 只回內建；source=object 另含內建的物件類素材（與 counts.object 一致）；
  // 帶 folderId（含未分類）或 mediaType=video 都不含內建。
  async listImages(query: ImageListQuery = {}): Promise<ImageListResponse> {
    await delay(250)
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 8
    const includeBuiltin = query.folderId === undefined && query.mediaType !== 'video'
    const pool = includeBuiltin ? [...db.assets, ...MATERIALS.map(materialAsAsset)] : db.assets
    const filtered = pool.filter((a) => {
      if (query.mediaType && a.type !== query.mediaType) return false
      if (query.source && a.source !== query.source && !(query.source === 'object' && a.category === 'object'))
        return false
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
  // sourceImageId：編輯器「另存為新素材」帶原圖 id 時才有值——跟真後端一樣，來源改標
  // source=edit。一律用 object URL 當 url（真後端一律回網址）：假資料模式下縮圖看得到真的圖，
  // 選圖彈窗裡剛上傳的圖也能直接當編輯器底圖／物件（picker-direct-upload design.md 決策 6）。
  // source：同真後端，'tryonModel'／'object' 照標，有 sourceImageId 時被 edit 蓋過。
  async uploadImage(
    file: File,
    folderId?: string,
    sourceImageId?: string,
    imageName?: string,
    source?: UploadSource,
  ): Promise<Asset> {
    await delay(400)
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error('FILE_TOO_LARGE')
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!SUPPORTED_UPLOAD_FORMATS.includes(extension)) throw new Error('UNSUPPORTED_FORMAT')
    // TODO: 後端就緒後把 file blob 上傳到 R2、回傳真實 URL 與尺寸；目前僅用檔名建立素材
    const a: Asset = {
      id: uid('a'),
      name: imageName || file.name,
      source: sourceImageId ? 'edit' : (source ?? 'upload'),
      dim: '1024×768',
      width: 1024,
      height: 768,
      type: 'image',
      folderId,
      url: URL.createObjectURL(file),
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

  // GET /editor/pricing — 編輯畫布工具列的價目表
  async getEditorPricing(): Promise<EditorPricing> {
    await delay(120)
    return { tools: { ...EDITOR_PRICING.tools } }
  },

  // POST /images/edit/tool — 編輯畫布套用一次 AI 工具，在執行當下就扣款。
  // 目前只有背景移除有價；加入物件／文字／淡化／裁切皆為 0，對齊設計稿的成本說明。
  async applyEditTool(tool: EditorToolKey): Promise<AppliedEditTool> {
    await delay(500)
    const cost = EDITOR_PRICING.tools[tool] ?? 0
    if (cost > 0) deduct(cost)
    return { tool, cost }
  },

  // POST /edit — AI 修圖（同真後端：固定 imageEdit 單價、勾幾項都一樣；指令與選項都空 → NOTHING_TO_DO 不扣點；
  // 回一張結果，圖用 picsum 依素材 id 取一張假圖）
  async retouchImage(req: RetouchReq): Promise<RetouchResult> {
    if (!req.options.length && !req.instruction?.trim()) throw new Error('NOTHING_TO_DO')
    const cost = priceOf('imageEdit') ?? 0
    deduct(cost)
    db.totalGen += 1
    db.generatedThisMonth += 1
    db.successGen += 1
    await delay(900)
    const generationId = uid('gen')
    db.editGenerations.add(generationId)
    const url = `https://picsum.photos/seed/${req.imageId}-${generationId}/400/300`
    return { id: uid('r'), generationId, url, adopted: false, method: req.method, options: req.options, cost }
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
      width: 1024,
      height: 768,
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

  // POST /generate（依 modelKey 單價扣點；帶 regenOf 時同後端一律只生一張）
  async generateImages(req: GenerateImageReq): Promise<GeneratedImage[]> {
    const price = priceOf(req.modelKey)
    if (price === undefined) throw new Error('MODEL_NOT_ALLOWED')
    const n = req.regenOf ? 1 : req.count
    deduct(price * n)
    db.totalGen += n
    db.imgGen += n // 圖生圖才計入採用率分母
    db.generatedThisMonth += n
    db.successGen += n
    await delay(900)
    const generationId = uid('gen')
    db.imageGenerations.add(generationId)
    return Array.from({ length: n }, () => ({ id: uid('r'), generationId, url: '', adopted: false }))
  },

  // POST /marketing/image＋POST /marketing/text（依 outputType 扣 marketingImage／marketingText 的價格）
  async generatePost(req: GeneratePostReq): Promise<GeneratedPost> {
    const wantImage = req.outputType !== 'textOnly'
    const wantText = req.outputType !== 'imageOnly'
    deduct((wantImage ? (priceOf('marketingImage') ?? 0) : 0) + (wantText ? (priceOf('marketingText') ?? 0) : 0))
    db.totalGen += 1
    db.generatedThisMonth += 1
    db.successGen += 1
    await delay(1000)
    const post: GeneratedPost = { hashtags: [] }
    if (wantImage) post.poster = { id: uid('r'), generationId: uid('gen'), url: '', adopted: false }
    if (wantText) {
      post.copy =
        '🌿 春天就是要換上最舒服的自己\n\n全新純棉系列，透氣不悶熱，五種溫柔色調任你搭配。現在下單享春夏限時 8 折，把好天氣穿在身上 ☀'
      post.hashtags = req.useBrand ? db.brand.hashtags.slice(0, 3) : ['#新品', '#日常']
    }
    return post
  },

  // GET /inspirations
  async listInspirations(): Promise<Inspiration[]> {
    await delay(150)
    return [
      { id: 'insp_1', name: '極簡白底', url: '' },
      { id: 'insp_2', name: '節慶紅金', url: '' },
    ]
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

  // POST /tryon（同真後端：固定檔位 tryonStandard、回一張結果；結果圖用 picsum 依模特 id 取一張假圖）。
  // 不登記進 imageGenerations：採用率只算 type='generate'（後端 metrics_calc），試穿的存入／下載不計
  async tryOn(req: TryOnReq): Promise<GeneratedImage> {
    deduct(priceOf('tryonStandard') ?? 0)
    db.totalGen += 1
    db.generatedThisMonth += 1
    db.successGen += 1
    await delay(1000)
    const generationId = uid('g')
    return { id: uid('r'), generationId, url: `https://picsum.photos/seed/${req.modelRefId}/400/500`, adopted: false }
  },

  // POST /generations/{id}/save → 生成結果落地成 AI 生成素材；同後端，存入圖庫本身就算採用。
  async saveGenerated(name: string, from: GenerationRef, folderId?: string): Promise<Asset> {
    await delay(300)
    const a: Asset = {
      id: uid('a'),
      name,
      source: db.editGenerations.has(from.generationId) ? 'edit' : 'aiGenerate',
      folderId: folderId || undefined,
      dim: '1024×768',
      width: 1024,
      height: 768,
      type: 'image',
    }
    db.assets.unshift(a)
    markAdopted(from)
    return a
  },

  // POST /generations/{id}/events（下載）→ 記錄採用；同一張重送不重複計
  async recordAdoption(from: GenerationRef): Promise<void> {
    await delay(100)
    markAdopted(from)
  },

  // GET /feeds/usage（同後端：byModule 與 daily 由 groupBy 二選一，另一個回 null；缺日補 0 由這裡做）
  // 每日用量是固定波形的示意值，只保證形狀與真後端一致
  async getUsage(params: UsageQuery): Promise<UsageSummary> {
    await delay(300)
    const period = periodWindow(params)
    const days = daysBetween(period.from, period.to)
    const daily = Array.from({ length: days }, (_, i) => ({ date: addDays(period.from, i), used: 20 + ((i * 7) % 41) }))
    const totalUsed = daily.reduce((sum, d) => sum + d.used, 0)
    const shares: [string, number, number | null, number][] = [
      ['generate', 0.42, 18, 12],
      ['marketingImage', 0.15, 4, 10],
      ['marketingText', 0.095, null, 3],
      ['video', 0.223, 62, 45],
      ['tryon', 0.112, -9, 15],
    ]
    const byModule = shares.map(([type, share, vsLastMonthPct, avgPerGen]) => ({
      type,
      used: Math.round(totalUsed * share),
      sharePct: Math.round(share * 1000) / 10,
      vsLastMonthPct,
      avgPerGen,
    }))
    return {
      period,
      totalUsed,
      dailyAvg: Math.round(totalUsed / days),
      vsLastMonthPct: 12,
      byModule: params.groupBy === 'module' ? byModule : null,
      daily: params.groupBy === 'day' ? daily : null,
    }
  },

  // GET /metrics（採用率等只算圖生圖；分母為 0 時同後端回 null）
  async getMetrics(params: PeriodParams): Promise<Metrics> {
    await delay(300)
    return {
      period: periodWindow(params),
      // 成功率＝全模組；採用率／平均重生成／每採用成本＝只算圖生圖
      successRate: db.totalGen ? Math.round((db.successGen / db.totalGen) * 1000) / 10 : null,
      adoptionRate: db.imgGen ? Math.round((db.adoptedGen / db.imgGen) * 1000) / 10 : null,
      avgRegenerate: db.regenBeforeAdopt,
      costPerAdopted: 6.1,
      vsLastPeriod: { successRate: 1.8, adoptionRate: 4.2, avgRegenerate: -0.3, costPerAdopted: null },
      monthGenerated: db.generatedThisMonth,
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
