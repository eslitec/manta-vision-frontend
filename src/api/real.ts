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
import type { Session } from '@/types/api'

// 打真後端的 API 實作。
//
// 後端 33 支端點裡，目前接得上的是身分驗證三支、`GET /bots`，以及
// `feat/gallery-finish` 分支帶來的圖庫／資料夾／內建素材共 10 支（見
// docs/api-status.md 的「✅ 可串」清單）。其餘（品牌、行銷、指標、修圖、影片）
// 都還是空殼，所以這裡把 `mockApi` 展開當底，只覆寫已經接得上的方法。
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
}
