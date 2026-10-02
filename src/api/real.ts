import { i18n } from '@/lang'
import { formatDimensions } from '@/utils/dimensions'
import { ApiError, API_ERROR_CODES, CLIENT_ERROR_CODES, hasErrorCode, isApiError } from './errors'
import { ctx, http } from './http'
import { mockApi } from './mock'
import type {
  Asset,
  AssetSource,
  Bot,
  Folder,
  FolderListResponse,
  ImageCounts,
  ImageListQuery,
  ImageListResponse,
  MaterialListResponse,
  MediaType,
  UploadSource,
} from '@/types/asset'
import type {
  AiModel,
  AiModelType,
  BrandProfile,
  FeedSummary,
  GeneratedImage,
  GeneratedPost,
  GenerateImageReq,
  GeneratePostReq,
  GenerationRef,
  Inspiration,
  Metrics,
  PeriodParams,
  RetouchOptionKey,
  RetouchReq,
  RetouchResult,
  Session,
  TryOnReq,
  UsageQuery,
  UsageSummary,
  VideoJob,
  VideoJobReq,
} from '@/types/api'

// 打真後端的 API 實作。
//
// 後端 33 支端點裡，目前接得上的是身分驗證三支、`GET /bots`、
// `feat/gallery-finish` 分支帶來的圖庫／資料夾／內建素材共 10 支，以及
// 品牌設定 `GET/PUT /brand` 兩支（見 docs/api-status.md 的「✅ 可串」清單），
// 以及圖生圖／行銷 PO 文／飼料餘額（`feat/mv-07-metrics` 分支的契約）、
// 試穿與肖像同意（`feat/tryon` 分支，docs/api/v14.md #17／#24／#25）。
// 其餘（修圖、影片）都還是空殼，所以這裡把 `mockApi` 展開當底，
// 只覆寫已經接得上的方法。
//
// 後端每補完一支，就把對應的方法從這裡加上去——展開的假資料會自動被蓋掉，
// 不必一次全部切換，也不會有「切過去整站空白」的斷崖。

/** `POST /auth/login` 的回應（後端 `docs/api.md` #1） */
interface LoginResponse {
  token: string
  role: string
  /** 憑證效期（秒）。目前是 7 天，且**沒有續期機制** */
  expiresIn: number
  userId: string
  botId: string
}

/** `POST /auth/register` 的回應（後端 `docs/api.md` #2）——注意沒有 token */
interface RegisterResponse {
  userId: string
  botId: string
}

function toSession(username: string, data: LoginResponse): Session {
  return {
    username,
    // 後端沒有「顯示名稱」這個欄位，帳號本身就是顯示名稱
    displayName: username,
    token: data.token,
    botId: data.botId,
    role: data.role,
    // 存絕對時間而非剩餘秒數：重新整理後才判斷得出來還有沒有效
    expiresAt: Date.now() + data.expiresIn * 1000,
  }
}

async function login(username: string, password: string): Promise<Session> {
  const { data } = await http.post<LoginResponse>('/auth/login', { username, password })

  return toSession(username, data)
}

async function register(username: string, password: string): Promise<Session> {
  // 註冊只回 userId／botId，**不給 token**——後端刻意把「開帳號」與「取得憑證」
  // 分成兩件事。但使用者的期待是「註冊完就進去了」，所以這裡接著登入一次。
  await http.post<RegisterResponse>('/auth/register', { username, password })

  return login(username, password)
}

async function logout(): Promise<void> {
  // 後端會把這張 token 加進黑名單（它沒有續期機制，這是唯一能讓外洩的 token 失效的手段）
  await http.post('/auth/logout')
}

// ── GET /bots ──
// 目前一帳號一 bot（登入回應已經帶 botId），暫時沒有 UI 會呼叫這支；
// 先接上供之後的「切換機器人」功能使用，契約上永遠回陣列。
interface WireBot {
  botId: string
  botName: string
}
async function listBots(): Promise<Bot[]> {
  const { data } = await http.get<{ items: WireBot[] }>('/bots')
  return data.items
}

// ── 圖庫（images）／資料夾（folders）／內建素材（materials）──
// 對齊後端 app/schemas/image.py、app/schemas/folder.py、app/schemas/material.py
// （`feat/gallery-finish`，尚未合併 main，但 docs/api-status.md 已列為可串）。

/** `GET /images`、`PUT /images/{id}`、`POST /upload` 共用的後端素材形狀 */
interface WireImage {
  imageId: string
  imageName: string
  url: string
  mediaType: MediaType
  source: AssetSource
  folderId: string | null
  isInUse: boolean
  createdAt: string
  // 可為 null：舊資料與 Pillow 解不開的檔案都是（見後端 feat/image-dimensions）；
  // 新上傳的檔案才有值。
  width: number | null
  height: number | null
  // 內建素材投影成 ImageResponse 時才有值（background／object／model）；images 為 null
  category?: Asset['category'] | null
}
interface WireImageListResponse {
  total: number
  page: number
  items: WireImage[]
  counts: ImageCounts
}

function toAsset(row: WireImage): Asset {
  return {
    id: row.imageId,
    name: row.imageName,
    source: row.source,
    dim: formatDimensions(row.width, row.height),
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    type: row.mediaType,
    folderId: row.folderId ?? undefined,
    // 後端只有布林值 isInUse，沒有實際引用「筆數」；沿用既有「> 0 視為被引用」
    // 的判斷式，只需要 0/1 就夠用。
    referencedBy: row.isInUse ? 1 : 0,
    url: row.url,
    createdAt: row.createdAt,
    category: row.category ?? undefined,
  }
}

// 圖庫網格是 8 張一頁的設計（LibraryView 的 pageSize），後端預設 10、上限 100——
// 不是同一個數字，這裡要主動帶 pageSize，不能靠後端預設值。
const LIBRARY_PAGE_SIZE = 8

async function listImages(query: ImageListQuery = {}): Promise<ImageListResponse> {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? LIBRARY_PAGE_SIZE,
  }
  if (query.mediaType) params.mediaType = query.mediaType
  if (query.source) params.source = query.source
  // 三態：undefined＝不篩；null＝後端的字面值 "null"（未分類）；字串＝該資料夾 id
  if (query.folderId === null) params.folderId = 'null'
  else if (query.folderId) params.folderId = query.folderId
  if (query.q) params.q = query.q

  const { data } = await http.get<WireImageListResponse>('/images', { params })
  return { total: data.total, page: data.page, items: data.items.map(toAsset), counts: data.counts }
}

// sourceImageId：編輯器「另存為新素材」帶原圖 id 時才有值，後端依此標 source=edit、
// derivedFrom 指回原圖（非破壞性）；見 manta-vision-backend docs/api/v7.md §4。
// imageName：另存為新素材時使用者在對話框輸入的名稱；不帶時後端用檔名。
// source：試穿頁的模特照帶 'tryonModel'（每隻機器人上限 20 張，第 21 張後端 400 VALUE_OUT_OF_RANGE）；
// 不帶＝upload。帶 sourceImageId 時後端一律標 edit、忽略 source。見 docs/api/v14.md #4。
async function uploadImage(
  file: File,
  folderId?: string,
  sourceImageId?: string,
  imageName?: string,
  source?: UploadSource,
): Promise<Asset> {
  const form = new FormData()
  form.append('file', file)
  if (folderId) form.append('folderId', folderId)
  if (sourceImageId) form.append('sourceImageId', sourceImageId)
  if (imageName) form.append('imageName', imageName)
  if (source) form.append('source', source)
  const { data } = await http.post<WireImage>('/upload', form)
  return toAsset(data)
}

// PUT /images/{id}：folderId 是三態欄位——`patch` 裡**有沒有這個 key**才是「動不動」，
// 不是它的值是什麼。呼叫端要嘛完全不放這個 key（不動），要嘛放 null（移出未分類）
// 或放資料夾 id（搬過去），不能圖方便一律塞 undefined——那樣序列化後行為是「不動」，
// 跟「移出未分類」是兩回事。
async function updateImage(imageId: string, patch: { name?: string; folderId?: string | null }): Promise<Asset> {
  const body: Record<string, unknown> = {}
  if (patch.name !== undefined) body.imageName = patch.name
  if ('folderId' in patch) body.folderId = patch.folderId
  const { data } = await http.put<WireImage>(`/images/${imageId}`, body)
  return toAsset(data)
}

async function deleteImage(imageId: string): Promise<{ deleted: boolean }> {
  const { data } = await http.delete<{ deleted: boolean }>(`/images/${imageId}`)
  return data
}

async function listFolders(): Promise<FolderListResponse> {
  const { data } = await http.get<FolderListResponse>('/folders')
  return data
}

async function createFolder(name: string): Promise<Folder> {
  const { data } = await http.post<Folder>('/folders', { folderName: name })
  return data
}

async function renameFolder(folderId: string, name: string): Promise<Folder> {
  const { data } = await http.put<Folder>(`/folders/${folderId}`, { folderName: name })
  return data
}

async function deleteFolder(folderId: string): Promise<{ deleted: boolean; imagesUnfiled: number }> {
  const { data } = await http.delete<{ deleted: boolean; imagesUnfiled: number }>(`/folders/${folderId}`)
  return data
}

async function listMaterials(category?: 'background' | 'object' | 'model'): Promise<MaterialListResponse> {
  const { data } = await http.get<MaterialListResponse>('/materials', { params: category ? { category } : undefined })
  return data
}

// ── 品牌設定（brand）──
// 對齊後端 `docs/api-status.md` §7（GET /brand #31、PUT /brand #32）。
//
// 前後端有兩處形狀對不上，這裡把決定記下來，之後回頭看才知道為什麼這樣寫：
// 1. `colors`：前端可以無限新增色票（`addColor()`），後端固定只有
//    primary／secondary／accent 三個具名欄位。這裡永遠只用陣列前 3 個索引對應
//    這三個欄位——**第 4 個以後的自訂色票不會存到真後端**，這是已知限制。
// 2. Logo：前端只會產生本機 `data:` URL（從沒真的上傳過），後端要求先
//    `POST /upload` 拿 `imageId`，PUT /brand 時再用 `logoImageId` 引用它。
//    這裡在存檔當下偵測 `data:` URL、幫忙補這一步。
//
// `avoidWords` 曾經是「前端單一字串、後端陣列」，但後端 9/2 起改成自由文字
// 字串（`app/schemas/brand.py::BrandUpdate.avoid_words`），前後端現在是同一個
// 形狀（`string | null`），不需要再 join／split。⚠️ 後端把「空字串」當「不動」、
// `null` 才是「清空」——要清空這個欄位時記得送 `null`，不能送 `''`。
//
// PUT /brand 是部分更新，三態語意（後端 `docs/api-status.md` §7）：
// 不帶這個 key＝不動；`null`／`[]`＝明確清空；有值＝設定。但 name／positioning／
// industry 這三個必填欄位不接受清空，空字串／null 一律 422——這裡不做前端擋，
// 交給後端的錯誤訊息（不在這次串接範圍內另外做欄位驗證）。
interface WireColorPalette {
  primary?: string
  secondary?: string
  accent?: string
}
interface WireBrand {
  brandId: string | null
  name: string | null
  positioning: string | null
  industry: string | null
  website: string | null
  customerAddress: string | null
  tone: string[] | null
  hashtags: string[] | null
  avoidWords: string | null
  colorPalette: WireColorPalette | null
  logoImageId: string | null
  logoUrl: string | null
  portraitConsentTemplate: string | null
  imageLicense: string | null
  isComplete: boolean
  updatedAt: string | null
}

// 色票欄位名稱是固定的三個角色，`label` 只在畫面上索引 3 以後的自訂色票才會被讀到
// （BrandSettingsView 的 colorLabels 對前 3 個永遠用 i18n 依索引顯示），這裡給的是
// 對齊 mock.ts 假資料的中文標籤，純粹是預設顯示字，不影響任何邏輯判斷。
const COLOR_SLOTS = [
  { key: 'primary', label: '主色' },
  { key: 'secondary', label: '輔色' },
  { key: 'accent', label: '點綴色' },
] as const

function toColors(palette: WireColorPalette | null): { label: string; hex: string }[] {
  if (!palette) return []
  return COLOR_SLOTS.filter((slot) => palette[slot.key]).map((slot) => ({
    label: slot.label,
    hex: (palette[slot.key] as string).toUpperCase(),
  }))
}

/** 只用陣列前 3 個索引對應 primary／secondary／accent；沒有的欄位就不放進去（三態：不動）。 */
function buildColorPalette(colors: { hex: string }[]): WireColorPalette | null {
  const palette: WireColorPalette = {}
  COLOR_SLOTS.forEach((slot, index) => {
    if (colors[index]?.hex) palette[slot.key] = colors[index].hex.toUpperCase()
  })
  return Object.keys(palette).length ? palette : null
}

// 後端不回傳 Logo 檔名，只有網址；顯示用的檔名就從網址最後一段猜一個回來。
function logoNameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').pop()
    return last ? decodeURIComponent(last) : ''
  } catch {
    return ''
  }
}

function toBrand(wire: WireBrand): BrandProfile {
  return {
    name: wire.name ?? '',
    positioning: wire.positioning ?? '',
    website: wire.website ?? '',
    industry: wire.industry ?? '',
    colors: toColors(wire.colorPalette),
    tones: wire.tone ?? [],
    hashtags: wire.hashtags ?? [],
    addressing: wire.customerAddress ?? '',
    avoidWords: wire.avoidWords ?? '',
    logoName: wire.logoUrl ? logoNameFromUrl(wire.logoUrl) : '',
    logoUrl: wire.logoUrl ?? '',
    portraitConsent: wire.portraitConsentTemplate ?? '',
    imageLicense: wire.imageLicense ?? '',
  }
}

/** data: URL（FileReader 讀出來的本機預覽）轉回 File，才能走既有的 uploadImage()。 */
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], filename || 'logo.png', { type: blob.type || 'image/png' })
}

async function getBrand(): Promise<BrandProfile> {
  const { data } = await http.get<WireBrand>('/brand')
  return toBrand(data)
}

async function saveBrand(profile: BrandProfile): Promise<BrandProfile> {
  // logoImageId 三態：undefined＝不動（Logo 沒變，沿用已經在後端的那個）；
  // null＝使用者清空了 Logo；字串＝新上傳（或换過）的 Logo 的 imageId。
  let logoImageId: string | null | undefined
  const who = identity()
  if (profile.logoUrl && profile.logoUrl.startsWith('data:')) {
    // 還是本機預覽，代表這張還沒真的上傳過——先補這一步再存
    const file = await dataUrlToFile(profile.logoUrl, profile.logoName ?? 'logo.png')
    const asset = await uploadImage(file)
    assertSameIdentity(who) // 上傳途中換帳號：不拿下一個帳號的憑證把上一個人的品牌資料 PUT 進去
    logoImageId = asset.id
    uploadedImageId = asset.id
  } else if (!profile.logoUrl) {
    logoImageId = null
  }

  const body: Record<string, unknown> = {
    name: profile.name,
    positioning: profile.positioning,
    industry: profile.industry,
    website: profile.website || null,
    customerAddress: profile.addressing || null,
    tone: profile.tones,
    hashtags: profile.hashtags,
    avoidWords: profile.avoidWords || null,
    colorPalette: buildColorPalette(profile.colors),
    portraitConsentTemplate: profile.portraitConsent || null,
    imageLicense: profile.imageLicense || null,
  }
  if (logoImageId !== undefined) body.logoImageId = logoImageId

  try {
    const { data } = await http.put<WireBrand>('/brand', body)
    return toBrand(data)
  } catch (e) {
    // 這次有新上傳 Logo、但整包存檔失敗：圖片已經真的存進系統了，卻沒有任何品牌
    // 資料引用它，會變成孤兒圖片留著占空間，所以失敗時要順手刪掉剛上傳的那張。
    // 刪除本身失敗就算了（不能讓清理失敗蓋掉原本真正的錯誤），最後還是把原本的
    // 錯誤丟出去，讓呼叫端（BrandSettingsView）照原本邏輯顯示錯誤訊息。
    // 等回應期間換了帳號就不清：DELETE 會帶下一個帳號的憑證（同 assertSameIdentity 的理由），
    // 孤兒圖留著比拿別人的身分送請求好。上傳後、PUT 前就換帳號的那條路同理，也不清。
    if (uploadedImageId && identity() === who) {
      await deleteImage(uploadedImageId).catch(() => {})
    }
    throw e
  }
}

// ── 飼料、模型價格、輔助描述、靈感 ──

async function getFeed(): Promise<FeedSummary> {
  const { data } = await http.get<FeedSummary>('/feeds')
  return data
}

// ── 用量與指標（GET /feeds/usage、GET /metrics）──
// 契約以後端程式碼為準：app/schemas/feed.py、app/schemas/period.py、app/schemas/metrics.py。
// 回應欄位與前端型別同名，原樣回傳。時區一律附上：後端對 month 忽略它，對 30d／90d／custom
// 用它決定「今天」與每日分組，送瀏覽器的時區才跟使用者看到的日曆一致。
function withTimezone<T extends PeriodParams>(params: T): T {
  return { ...params, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
}

async function getUsage(params: UsageQuery): Promise<UsageSummary> {
  const { data } = await http.get<UsageSummary>('/feeds/usage', { params: withTimezone(params) })
  return data
}

async function getMetrics(params: PeriodParams): Promise<Metrics> {
  const { data } = await http.get<Metrics>('/metrics', { params: withTimezone(params) })
  return data
}

async function listModels(modelType?: AiModelType): Promise<AiModel[]> {
  const { data } = await http.get<{ items: AiModel[] }>('/ai-models', {
    params: modelType ? { modelType } : undefined,
  })
  return data.items
}

async function enhancePrompt(text: string): Promise<string> {
  // 不扣點、不帶 Idempotency-Key。上游本身 30 秒，全域 30 秒會搶先切斷，所以放寬到 40 秒
  const { data } = await http.post<{ enhancedPrompt: string }>(
    '/prompt/enhance',
    { target: 'image', prompt: text },
    { timeout: 40_000 },
  )
  return data.enhancedPrompt
}

interface WireInspiration {
  inspirationId: string
  inspirationName: string
  url: string
}
async function listInspirations(): Promise<Inspiration[]> {
  // promptTemplate 不收：後端送出生成時不讀它，這次只帶 inspirationId
  const { data } = await http.get<{ items: WireInspiration[] }>('/inspirations')
  return data.items.map((i) => ({ id: i.inspirationId, name: i.inspirationName, url: i.url }))
}

// ── 付費生成（POST /generate、/marketing/image、/marketing/text）與輪詢（GET /generations/{id}）──
// 契約以後端程式碼為準：app/schemas/generation.py、app/schemas/marketing.py、app/idempotency.py

// 只宣告前端讀得到的欄位（同 getFeed 的取捨）；完整形狀以後端 schemas 為準
interface WireResult {
  resultId: string
  tempUrl: string
}
/** 200 回應與輪詢到 done 的共同部分：圖看 results，文案看 caption／hashtags */
interface WireOutput {
  generationId: string
  results?: WireResult[]
  caption?: string | null
  hashtags?: string[] | null
  costFeeds?: number
}
interface WirePending {
  generationId: string
  pollAfterMs?: number
}
interface WireStatus extends WireOutput {
  status: 'processing' | 'done' | 'failed'
}

// 後端同步最多等上游 80 秒才回 202，Cloudflare 的硬上限是 100 秒；
// 用全域 30 秒的話，會在後端已經開始扣點時先把連線切斷。
const PAID_TIMEOUT_MS = 100_000
/** 逾時／斷線最多送幾次（含第一次）。409 不算在這裡面，改用 PAID_IN_PROGRESS_MS 擋 */
const PAID_MAX_ATTEMPTS = 3
const PAID_RETRY_DELAY_MS = 5000
// 409＝同一把 key 的前一發還在後端跑（回應在路上丟了）。後端要等 200 或 202 定案才停止回 409，
// 而同步最多 80 秒，所以 409 一直重送到「最後一次不確定的送出後 100＋20 秒」，期限內一定拿得到回放。
const PAID_IN_PROGRESS_MS = PAID_TIMEOUT_MS + 20_000
// ponytail: 後端背景續問上限 600 秒（從 202 起算），到期後還要取結果、存 R2，所以多等 1 分鐘。
// 前端沒有「之後回來看」的頁面，停太早使用者拿不到已扣點的結果；有生成紀錄頁之後再縮短。
const POLL_MAX_MS = 11 * 60_000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
// 「不確定有沒有送到」：逾時、斷線，以及閘道自己吐的 5xx（nginx 504、Cloudflare 524、部署中的 502）——
// 那時後端可能還在跑、會扣點。後端自己回的錯誤一定帶 requestId（app/errors.py），那是確定的結果。
const isTransient = (e: unknown) =>
  hasErrorCode(e, CLIENT_ERROR_CODES.TIMEOUT) ||
  hasErrorCode(e, CLIENT_ERROR_CODES.NETWORK_ERROR) ||
  (isApiError(e) && e.status >= 500 && !e.requestId)
// 輪詢打的是 GET，本身冪等：網路抖動與 5xx（反向代理吐的 HTML 502／504）都等下一輪再問
const isPollTransient = (e: unknown) => isTransient(e) || (isApiError(e) && e.status >= 500)
// 結果已確定、沒有懸著的扣款：4xx（後端放掉 key），以及 UPSTREAM_ERROR——後端 generation.py `_execute`
// 的兜底 except 先 billing.release 才往上拋（502／504 都是這個碼）。其餘 5xx 可能發生在扣款之後，不算
const isSettledFailure = (e: unknown) =>
  isApiError(e) && ((e.status >= 400 && e.status < 500) || e.code === API_ERROR_CODES.UPSTREAM_ERROR)

// 「端點＋body」→ 還沒有確定結果的那把 Idempotency-Key。
// ponytail: 只存在記憶體，重新整理就消失；輸入差一個字就視為新的操作。要跨重新整理再搬到 sessionStorage
const openKeys = new Map<string, string>()
/** 登出時呼叫（session store 的 discard）：上一個帳號沒定案的 key 不留給下一個帳號 */
export function resetPaidRequests(): void {
  openKeys.clear()
}

// 付費流程綁住送出當下的登入身分：重送與輪詢的認證標頭是送出那一刻才從 ctx 取的，
// 中途登出、換帳號的話會變成拿下一個帳號的憑證送上一個人的請求（扣到別人的點）。
const identity = () => `${ctx.token}\n${ctx.botId}`
/** 結果已定案才丟 key；而且只丟自己那一把——同一個 op 現在登記的若是別把 key，那不是這次請求的 */
function closeKey(op: string, key: string | undefined): void {
  if (key !== undefined && openKeys.get(op) === key) openKeys.delete(op)
}
function assertSameIdentity(who: string): void {
  if (identity() !== who)
    throw new ApiError({ code: CLIENT_ERROR_CODES.SESSION_CHANGED, message: i18n.global.t('errors.sessionChanged') })
}

/**
 * 付費端點：同一份輸入沿用還沒有確定結果的那把 Idempotency-Key，否則產新的一把。
 * 逾時、斷線、閘道 5xx、409 等到期限、未知的 5xx 丟錯後 key 留著：使用者再按一次，前一發若已扣點，
 * 後端會回放或回 409，不會再扣。2xx、4xx、UPSTREAM_ERROR 結果已確定，下次按是真的想再生成一次。
 * pendingOn202：202 只是「已受理」的端點（runGeneration）收到 202 時 key 留著，由呼叫端在輪詢定案後丟；
 * 影片的 202 就是完整答案，不帶這個旗標。
 * 每次送出前、每次回應（成功或失敗）回來後都確認登入身分沒變（見 assertSameIdentity），變了就丟 SESSION_CHANGED：
 * 不用新帳號的憑證重送，也不碰 openKeys——登出已經清過，現在裡面同一個 op 的 key 是下一個帳號的。
 * 重送沿用同一把 key 與**同一個 body 物件**——後端比對 body 的 bytes，物件換了就會被當成新請求再扣一次點。
 * 只重送「不確定有沒有送到」的錯誤（isTransient，最多 PAID_MAX_ATTEMPTS 次），以及同 key 還在跑的 409
 * （重送到 PAID_IN_PROGRESS_MS 期限）；其他錯誤（402、400、CONTENT_BLOCKED、後端的 5xx…）直接往上丟。
 * op：辨識「同一份輸入」的字串。FormData 經 JSON.stringify 一律是 "{}"，multipart 端點要自己給。
 */
async function postPaid<T>(
  url: string,
  body: object,
  op = url + JSON.stringify(body),
  pendingOn202 = false,
  who = identity(),
) {
  const key = openKeys.get(op) ?? crypto.randomUUID()
  openKeys.set(op, key)
  let deadline = Date.now() + PAID_IN_PROGRESS_MS
  for (let failures = 0; ;) {
    assertSameIdentity(who)
    try {
      const res = await http.post<T>(url, body, { headers: { 'Idempotency-Key': key }, timeout: PAID_TIMEOUT_MS })
      assertSameIdentity(who) // 晚到的回應：送出後已換帳號，不採用也不動 key
      if (!(pendingOn202 && res.status === 202)) closeKey(op, key)
      return res
    } catch (e) {
      assertSameIdentity(who) // 同上（try 裡丟的 SESSION_CHANGED 也從這裡原樣再丟）
      if (hasErrorCode(e, API_ERROR_CODES.IDEMPOTENCY_IN_PROGRESS)) {
        if (Date.now() >= deadline) throw e
      } else {
        if (isSettledFailure(e)) closeKey(op, key)
        if (!isTransient(e) || ++failures >= PAID_MAX_ATTEMPTS) throw e
        // 那一發可能才剛在後端開跑（例如逾時 100 秒後），409 期限從這裡重新算
        deadline = Date.now() + PAID_IN_PROGRESS_MS
      }
      await sleep(PAID_RETRY_DELAY_MS)
    }
  }
}

/**
 * 202 之後每 pollAfterMs 打一次 GET /generations/{id}，直到 done 或 failed。不重送 POST。
 * who：送出 POST 當下的身分，由呼叫端傳進來——在這裡重新擷取的話，晚到的 202 會拿到下一個帳號的身分。
 */
async function pollGeneration(generationId: string, who: string, pollAfterMs = 5000): Promise<WireOutput> {
  const deadline = Date.now() + POLL_MAX_MS
  for (;;) {
    await sleep(Math.max(1000, pollAfterMs))
    assertSameIdentity(who) // 登出、換帳號後不拿別人的憑證問上一個人的生成
    try {
      const { data } = await http.get<WireStatus>(`/generations/${generationId}`)
      assertSameIdentity(who) // 晚到的輪詢回應：不把上一個人的結果交出去，也不讓呼叫端據此丟 key
      if (data.status === 'done') return data
      // failed 不一定退點（202 之後被審核擋下照樣結清），訊息不能叫人原樣重送
      if (data.status === 'failed')
        throw new ApiError({
          code: CLIENT_ERROR_CODES.GENERATION_FAILED,
          message: i18n.global.t('errors.backgroundGenerationFailed'),
        })
    } catch (e) {
      assertSameIdentity(who)
      if (!isPollTransient(e)) throw e // failed、404、401 直接丟
    }
    if (Date.now() >= deadline)
      throw new ApiError({
        code: CLIENT_ERROR_CODES.GENERATION_STILL_PROCESSING,
        message: i18n.global.t('errors.generationStillProcessing', { id: generationId }),
      })
  }
}

/**
 * 送出付費生成：200 直接回，202 改走輪詢。輪詢放在 postPaid 的重送迴圈外面，輪詢失敗不會重送 POST。
 * 202 只是「已受理」（已預留點數）：key 留到輪詢得到 done／failed 才丟。輪詢沒定案就斷掉（404、逾時上限…）時，
 * 同一份輸入再按一次會帶同一把 key，後端回放同一個 202（同一個 generationId），接回去輪詢而不是再扣一次。
 * ponytail: 後端對 202 的冪等回放保留 24 小時（idempotency_ttl_seconds，app/idempotency.py），但 key 只存在記憶體：
 * 重新整理頁面或冪等範圍換了（重新登入換 token）就接不回去，要蓋住得持久化 key 或做生成紀錄頁。
 */
async function runGeneration(url: string, body: object, op = url + JSON.stringify(body)): Promise<WireOutput> {
  const who = identity()
  const res = await postPaid<WireOutput | WirePending>(url, body, op, true, who)
  if (res.status !== 202) return res.data as WireOutput
  const pending = res.data as WirePending
  const key = openKeys.get(op) // postPaid 剛確認過身分沒變，這把就是本次送出的 key
  try {
    const out = await pollGeneration(pending.generationId, who, pending.pollAfterMs)
    closeKey(op, key)
    return out
  } catch (e) {
    if (hasErrorCode(e, CLIENT_ERROR_CODES.GENERATION_FAILED)) closeKey(op, key) // failed 是定案，其餘都還懸著
    throw e
  }
}

function toGeneratedImage(generationId: string, r: WireResult): GeneratedImage {
  return { id: r.resultId, generationId, url: r.tempUrl, adopted: false }
}

/** 單張結果的端點（/tryon、/edit）：後端 results[] 固定一張；沒有就是回應形狀不對，不能讓畫面拿到 undefined 當成功 */
function firstImage(out: WireOutput): GeneratedImage {
  const r = out.results?.[0]
  if (!r)
    throw new ApiError({
      code: CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE,
      message: i18n.global.t('errors.generationFailed'),
    })
  return toGeneratedImage(out.generationId, r)
}

async function generateImages(req: GenerateImageReq): Promise<GeneratedImage[]> {
  // req 的欄位名等於後端 GenerateRequest，整包當 body；undefined 的鍵會被 JSON.stringify 丟掉
  const out = await runGeneration('/generate', req)
  return (out.results ?? []).map((r) => toGeneratedImage(out.generationId, r))
}

async function generatePost(req: GeneratePostReq): Promise<GeneratedPost> {
  const wantImage = req.outputType !== 'textOnly'
  const wantText = req.outputType !== 'imageOnly'
  // 兩支端點互不依賴：平行送出、各自一把 key、成敗分開算。body 分開組，不能混用
  const [image, text] = await Promise.allSettled([
    wantImage
      ? runGeneration('/marketing/image', {
          imageId: req.imageId,
          posterText: req.posterText,
          ratio: req.ratio,
          inspirationId: req.inspirationId,
          useBrand: req.useBrand,
        })
      : null,
    wantText ? runGeneration('/marketing/text', { productDesc: req.productDesc, useBrand: req.useBrand }) : null,
  ])
  const post: GeneratedPost = { hashtags: [] }
  if (image.status === 'fulfilled' && image.value?.results?.[0])
    post.poster = toGeneratedImage(image.value.generationId, image.value.results[0])
  if (text.status === 'fulfilled' && text.value) {
    post.copy = text.value.caption ?? ''
    post.hashtags = text.value.hashtags ?? []
  }
  const errors = [image, text].flatMap((r) => (r.status === 'rejected' ? [r.reason] : []))
  if (errors.length && !post.poster && post.copy === undefined) throw errors[0] // 全部失敗：照常丟錯
  if (errors.length) post.partialError = errors[0] // 成功一半：交給畫面顯示另一半的錯
  return post
}

// ── 試穿（POST /tryon）：與 /generate 同一條付費管線（冪等鍵、100 秒逾時、202 輪詢）──
// 契約：docs/api/v14.md #17。模型固定（後端取 modelType=tryon 且啟用的那一列）、無 prompt、無 useBrand。
// 403 CONSENT_REQUIRED（upload 來源且未同意）與 404（模特／衣服不存在或非本 bot）都是 4xx，postPaid 不重送。
async function tryOn(req: TryOnReq): Promise<GeneratedImage> {
  return firstImage(await runGeneration('/tryon', req))
}

// ── AI 修圖（POST /edit）：multipart，與 /generate 同一條付費管線（冪等鍵、100 秒逾時、202 輪詢）──
// 契約以後端為準：app/schemas/edit.py。模型固定 imageEdit、每次一個單價，勾幾項都一樣；
// options 用同一個 key 重複 append（逗號串／JSON 字串會 400）；mask 不送（目前模型不支援，帶了一律 400）。
const RETOUCH_OPTION_WIRE: Record<RetouchOptionKey, string> = {
  removeObjects: 'removeObject',
  repair: 'fixFlaw',
  lighting: 'lightFix',
  upscale: 'upscale2x', // 後端只是多一句提示詞，不保證輸出尺寸
}
async function retouchImage(req: RetouchReq): Promise<RetouchResult> {
  const prompt = req.instruction?.trim() || undefined
  const options = req.options.map((key) => RETOUCH_OPTION_WIRE[key])
  const form = new FormData()
  form.append('imageId', req.imageId)
  if (prompt) form.append('prompt', prompt)
  options.forEach((option) => form.append('options', option))
  const op = '/edit' + JSON.stringify({ imageId: req.imageId, prompt, options })
  const out = await runGeneration('/edit', form, op)
  return { ...firstImage(out), method: req.method, options: req.options, cost: out.costFeeds ?? 0 }
}

// ── 圖生影（POST /video、GET /video/{taskId}、GET /video）──
// 契約以後端為準：app/schemas/video.py、app/routers/video.py（#21～#23）。全站唯一非同步的生成：
// POST 預留點數、建任務、立刻回 202（就是完整答案，24 小時內同一把 key 回放同一個 taskId）；
// 進度由 store 每 3 秒打 #22。不走 runGeneration——它看到 202 會去輪詢 /generations/{id}。
interface WireVideoTask {
  taskId: string
  taskName?: string | null
  status: VideoJob['status']
  progress?: number
  etaSeconds?: number | null
  resultUrl?: string | null
  failReason?: string | null
  costFeeds?: number
  durationMs?: number | null
}
const toVideoJob = (w: WireVideoTask): VideoJob => ({
  id: w.taskId,
  name: w.taskName ?? undefined,
  status: w.status,
  progress: w.progress ?? 0, // 202 沒有 progress
  cost: w.costFeeds ?? 0,
  etaSeconds: w.etaSeconds ?? undefined,
  resultUrl: w.resultUrl ?? undefined,
  error: w.failReason ?? undefined,
  durationMs: w.durationMs ?? undefined,
})

async function createVideoJob(req: VideoJobReq): Promise<VideoJob> {
  // req 的欄位名等於後端 VideoCreateRequest，整包當 body；402／400／404／415 都是 4xx，postPaid 不重送
  const { data } = await postPaid<WireVideoTask>('/video', req)
  return toVideoJob(data)
}

async function getVideoJob(id: string): Promise<VideoJob> {
  const { data } = await http.get<WireVideoTask>(`/video/${id}`)
  return toVideoJob(data)
}

// unread 不讀：後端恆為 0，已讀只存在前端記憶體（擱置區 #9）
async function listVideoJobs(): Promise<VideoJob[]> {
  const { data } = await http.get<{ unread: number; items: WireVideoTask[] }>('/video', { params: { limit: 10 } })
  return data.items.map(toVideoJob)
}

// ── 肖像同意（GET／PUT /users/me/consent；user-scoped，不看 X-Bot-Id）──
// 契約：docs/api/v14.md #24／#25。同意綁使用者個人，沒有撤回（PUT 只收 true）。
async function getConsent(): Promise<{ consented: boolean }> {
  const { data } = await http.get<{ portraitConsent: boolean }>('/users/me/consent')
  return { consented: data.portraitConsent }
}

async function giveConsent(): Promise<void> {
  await http.put('/users/me/consent', { consent: true })
}

// ── 生成結果：存入圖庫、採用事件（不扣點，不帶 Idempotency-Key）──

// folderId：存放位置（修圖頁的另存對話框可選資料夾）；不帶＝未分類
async function saveGenerated(name: string, from: GenerationRef, folderId?: string): Promise<Asset> {
  const { data } = await http.post<WireImage>(`/generations/${from.generationId}/save`, {
    resultId: from.id,
    imageName: name,
    folderId: folderId || undefined,
  })
  return toAsset(data)
}

async function recordAdoption(from: GenerationRef): Promise<void> {
  // 後端只收 downloaded（存入圖庫由 /save 自己記）；冪等，重送沒關係
  await http.post(`/generations/${from.generationId}/events`, { event: 'downloaded', resultId: from.id })
}

export const realApi = {
  ...mockApi,
  login,
  register,
  logout,
  listBots,
  listImages,
  uploadImage,
  updateImage,
  deleteImage,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  listMaterials,
  getBrand,
  saveBrand,
  getFeed,
  getUsage,
  getMetrics,
  listModels,
  enhancePrompt,
  generateImages,
  generatePost,
  saveGenerated,
  recordAdoption,
  listInspirations,
  tryOn,
  retouchImage,
  createVideoJob,
  getVideoJob,
  listVideoJobs,
  getConsent,
  giveConsent,
  // 儲值明確停用：`...mockApi` 會把假儲值帶進來，按下去會把 mock 的假餘額寫進 feed store，
  // 而右上角已改讀真的 GET /feeds，畫面會出現「儲值成功、生成卻 402」。TopUpDialog 已有「不支援」分支。
  // 後端的 POST /feeds/topup 是不收錢的模擬儲值，要不要接等產品確認。
  topUpFeed: undefined,
}
