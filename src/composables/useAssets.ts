import { ref } from 'vue'
import type { Asset } from '@/types/asset'
import { api } from '@/api'

// 圖庫素材的單一來源，圖庫頁與「從圖庫選擇」彈窗共用（依 bot_id 隔離）。
const assets = ref<Asset[]>([])
const loaded = ref(false)

// 使用者歸檔的資料夾清單
const folders = ref<string[]>([])
const foldersLoaded = ref(false)

// ⚠️ 契約警語（見 contract-diff 報告「最該先改的契約」第 2 項）：
// 真後端的 GET /images 是分頁的（預設 pageSize=24），不會一次回全部素材。
// 這裡跟 mock 一樣先假設「一次拿到全部」，串接真後端時如果照抄這個假設，
// 超過 24 筆的素材、資料夾計數、分類統計會安靜地消失、畫面不會報錯——
// 串接前務必先把這裡改成依 page/pageSize 請求、並改用後端回傳的 counts/total。
async function load(force = false) {
  if (loaded.value && !force) return
  assets.value = await api.listImages()
  loaded.value = true
}

async function loadFolders(force = false) {
  if (foldersLoaded.value && !force) return
  folders.value = await api.listFolders()
  foldersLoaded.value = true
}

// 新增資料夾（回存後端回傳的最新清單）
async function addFolder(name: string) {
  folders.value = await api.createFolder(name)
}

// 上傳素材（來源＝上傳）；可指定落到哪個資料夾
async function upload(file: File, folder?: string) {
  const a = await api.uploadImage(file, folder)
  assets.value.unshift(a)
  return a
}

// 把選取素材移至資料夾（1:N＝替換歸屬，會離開原資料夾）；完成後重讀
async function moveToFolder(assetIds: string[], folder: string) {
  await api.moveToFolder(assetIds, folder)
  await load(true)
}

// 把選取素材移出目前資料夾（1:N＝移回未分類，素材仍保留在圖庫）
async function removeFromFolder(assetIds: string[]) {
  await api.removeFromFolder(assetIds)
  await load(true)
}

// 批次刪除素材
async function deleteAssets(assetIds: string[]) {
  await api.deleteImages(assetIds)
  await load(true)
}

// 生成結果「存入圖庫」（選用）→ 落地成 AI 生成素材
async function saveGenerated(name: string) {
  const a = await api.saveGenerated(name)
  assets.value.unshift(a)
  return a
}

// 編輯器採非破壞式儲存：後端建立新的「編輯產物」，原素材不會被覆寫。
async function saveEdited(name: string, opts?: { folder?: string; keepLayers?: boolean }) {
  const a = await api.editImage(name, opts)
  assets.value.unshift(a)
  return a
}

export function useAssets() {
  return {
    assets,
    loaded,
    folders,
    load,
    loadFolders,
    addFolder,
    moveToFolder,
    removeFromFolder,
    deleteAssets,
    upload,
    saveGenerated,
    saveEdited,
  }
}
