import { http } from './http'
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
} from '@/types/asset'
import type { BrandProfile, Session } from '@/types/api'

// 打真後端的 API 實作。
//
// 後端 33 支端點裡，目前接得上的是身分驗證三支、`GET /bots`、
// `feat/gallery-finish` 分支帶來的圖庫／資料夾／內建素材共 10 支，以及
// 品牌設定 `GET/PUT /brand` 兩支（見 docs/api-status.md 的「✅ 可串」清單）。
// 其餘（行銷、指標、修圖、影片）都還是空殼，所以這裡把 `mockApi` 展開當底，
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
}
interface WireImageListResponse {
  total: number
  page: number
  items: WireImage[]
  counts: ImageCounts
}

// 後端目前不回寬高（見 docs/api-status.md「請前端評估需不需要縮圖」的留言），
// 這裡先留空字串，畫面上等同沒有這行 meta；等後端補了欄位再接上。
function toAsset(row: WireImage): Asset {
  return {
    id: row.imageId,
    name: row.imageName,
    source: row.source,
    dim: '',
    type: row.mediaType,
    folderId: row.folderId ?? undefined,
    // 後端只有布林值 isInUse，沒有實際引用「筆數」；沿用既有「> 0 視為被引用」
    // 的判斷式，只需要 0/1 就夠用。
    referencedBy: row.isInUse ? 1 : 0,
    url: row.url,
    createdAt: row.createdAt,
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

async function uploadImage(file: File, folderId?: string): Promise<Asset> {
  const form = new FormData()
  form.append('file', file)
  if (folderId) form.append('folderId', folderId)
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
// 前後端有三處形狀對不上，這裡把決定記下來，之後回頭看才知道為什麼這樣寫：
// 1. `avoidWords`：前端是單一字串（textarea），後端是陣列。用「、」join／split。
// 2. `colors`：前端可以無限新增色票（`addColor()`），後端固定只有
//    primary／secondary／accent 三個具名欄位。這裡永遠只用陣列前 3 個索引對應
//    這三個欄位——**第 4 個以後的自訂色票不會存到真後端**，這是已知限制。
// 3. Logo：前端只會產生本機 `data:` URL（從沒真的上傳過），後端要求先
//    `POST /upload` 拿 `imageId`，PUT /brand 時再用 `logoImageId` 引用它。
//    這裡在存檔當下偵測 `data:` URL、幫忙補這一步。
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
  avoidWords: string[] | null
  colorPalette: WireColorPalette | null
  logoImageId: string | null
  logoUrl: string | null
  portraitConsentTemplate: string | null
  imageLicense: string | null
  isComplete: boolean
  updatedAt: string | null
}

const AVOID_WORDS_SEPARATOR = '、'
function splitAvoidWords(text: string): string[] {
  return text
    .split(/[、,，]/)
    .map((word) => word.trim())
    .filter(Boolean)
}
function joinAvoidWords(words: string[] | null | undefined): string {
  return (words ?? []).join(AVOID_WORDS_SEPARATOR)
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
    avoidWords: joinAvoidWords(wire.avoidWords),
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
  if (profile.logoUrl && profile.logoUrl.startsWith('data:')) {
    // 還是本機預覽，代表這張還沒真的上傳過——先補這一步再存
    const file = await dataUrlToFile(profile.logoUrl, profile.logoName ?? 'logo.png')
    const asset = await uploadImage(file)
    logoImageId = asset.id
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
    avoidWords: splitAvoidWords(profile.avoidWords),
    colorPalette: buildColorPalette(profile.colors),
    portraitConsentTemplate: profile.portraitConsent || null,
    imageLicense: profile.imageLicense || null,
  }
  if (logoImageId !== undefined) body.logoImageId = logoImageId

  const { data } = await http.put<WireBrand>('/brand', body)
  return toBrand(data)
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
}
