import { ref } from 'vue'
import type { Asset } from '@/types/asset'
import { api } from '@/api'

// 圖庫素材的單一來源，圖庫頁與「從圖庫選擇」彈窗共用（依 bot_id 隔離）。
const assets = ref<Asset[]>([])
const loaded = ref(false)

// 使用者歸檔的資料夾清單
const folders = ref<string[]>([])
const foldersLoaded = ref(false)

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

// 把既有素材加入資料夾（多重歸屬）；完成後重讀以反映最新歸屬
async function addToFolder(assetIds: string[], folder: string) {
  await api.addToFolder(assetIds, folder)
  await load(true)
}

// 把素材移出資料夾（素材仍保留在圖庫，只是不再屬於這個資料夾）
async function removeFromFolder(assetIds: string[], folder: string) {
  await api.removeFromFolder(assetIds, folder)
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
async function saveEdited(name: string) {
  const a = await api.editImage(name)
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
    addToFolder,
    removeFromFolder,
    deleteAssets,
    upload,
    saveGenerated,
    saveEdited,
  }
}
