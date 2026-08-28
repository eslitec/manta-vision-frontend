import { ref } from 'vue'
import type { Asset, BatchResult, Folder, ImageCounts, ImageListQuery } from '@/types/asset'
import { api } from '@/api'

// 圖庫素材的存取層，圖庫頁與「從圖庫選擇」彈窗共用。
//
// ⚠️ 架構跟串真後端之前不一樣：真後端的 GET /images 是伺服器端分頁／篩選
// （page/pageSize/counts 都由後端算），圖庫頁與彈窗各自要看不同頁碼、不同篩選
// 條件的素材——不能再共用同一份「素材陣列」單例，否則兩邊互相覆蓋對方的查詢結果。
//
// 因此這裡把兩種狀態分開：
// - 資料夾清單（folders／unfiledCount）：不分頁、量少、對整個機器人都一樣，維持模組層級單例。
// - 素材清單（assets／total／counts／page／loading）：**每次呼叫 useAssets() 都拿到一份新的**，
//   圖庫頁與彈窗各自帶自己的查詢條件呼叫 load(query)，互不影響；批次操作完後要不要重讀，
//   由呼叫端（知道自己目前查詢條件是什麼）自己決定、自己呼叫 load()。

// 使用者歸檔的資料夾清單（模組層級單例）
const folders = ref<Folder[]>([])
const unfiledCount = ref(0)
const foldersLoaded = ref(false)

async function loadFolders(force = false) {
  if (foldersLoaded.value && !force) return
  const res = await api.listFolders()
  folders.value = res.items
  unfiledCount.value = res.unfiledCount
  foldersLoaded.value = true
}

// 新增資料夾
async function addFolder(name: string) {
  const folder = await api.createFolder(name)
  await loadFolders(true)
  return folder
}

async function renameFolder(folderId: string, name: string) {
  const folder = await api.renameFolder(folderId, name)
  await loadFolders(true)
  return folder
}

async function deleteFolder(folderId: string) {
  const res = await api.deleteFolder(folderId)
  await loadFolders(true)
  return res
}

// 後端沒有批次端點，一律單筆迴圈＋Promise.allSettled 彙整成功／失敗的 id，
// 讓呼叫端可以「能做的先做，做不到的告訴使用者」，不會因為其中一筆失敗就整批卡住。
async function runBatch(ids: string[], run: (id: string) => Promise<unknown>): Promise<BatchResult> {
  const results = await Promise.allSettled(ids.map((id) => run(id).then(() => id)))
  const succeededIds: string[] = []
  const failedIds: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') succeededIds.push(r.value)
    else failedIds.push(ids[i])
  })
  return { succeededIds, failedIds }
}

export function useAssets() {
  // 素材清單：每次呼叫都是獨立的一份狀態，讓圖庫頁與「從圖庫選擇」彈窗可以各自帶不同的查詢條件
  const assets = ref<Asset[]>([])
  const total = ref(0)
  const page = ref(1)
  const counts = ref<ImageCounts>({ all: 0, upload: 0, aiGenerate: 0, edit: 0, object: 0, video: 0 })
  const loading = ref(false)

  async function load(query: ImageListQuery = {}) {
    loading.value = true
    try {
      const res = await api.listImages(query)
      assets.value = res.items
      total.value = res.total
      page.value = res.page
      counts.value = res.counts
    } finally {
      loading.value = false
    }
  }

  // 上傳素材（來源＝上傳）；可指定落到哪個資料夾
  async function upload(file: File, folderId?: string) {
    return api.uploadImage(file, folderId)
  }

  // 批次把選取素材移至資料夾（1:N＝替換歸屬，會離開原資料夾）；後端沒有批次端點，逐筆呼叫 PUT /images/{id}
  async function moveToFolder(assetIds: string[], folderId: string): Promise<BatchResult> {
    return runBatch(assetIds, (id) => api.updateImage(id, { folderId }))
  }

  // 批次把選取素材移出目前資料夾（1:N＝folderId 設為 null，素材仍保留在圖庫）
  async function removeFromFolder(assetIds: string[]): Promise<BatchResult> {
    return runBatch(assetIds, (id) => api.updateImage(id, { folderId: null }))
  }

  // 批次刪除素材（被引用中的素材後端會回 ASSET_IN_USE，算在 failedIds 裡）
  async function deleteAssets(assetIds: string[]): Promise<BatchResult> {
    return runBatch(assetIds, (id) => api.deleteImage(id))
  }

  // 生成結果「存入圖庫」（選用）→ 落地成 AI 生成素材
  async function saveGenerated(name: string) {
    return api.saveGenerated(name)
  }

  // 編輯器採非破壞式儲存：後端建立新的「編輯產物」，原素材不會被覆寫。
  async function saveEdited(name: string, opts?: { folder?: string; keepLayers?: boolean }) {
    return api.editImage(name, opts)
  }

  return {
    assets,
    total,
    page,
    counts,
    loading,
    load,
    folders,
    unfiledCount,
    loadFolders,
    addFolder,
    renameFolder,
    deleteFolder,
    moveToFolder,
    removeFromFolder,
    deleteAssets,
    upload,
    saveGenerated,
    saveEdited,
  }
}
