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

// 生成結果「存入圖庫」（選用）→ 落地成 AI 生成素材
async function saveGenerated(name: string) {
  const a = await api.saveGenerated(name)
  assets.value.unshift(a)
  return a
}

export function useAssets() {
  return { assets, loaded, folders, load, loadFolders, addFolder, addToFolder, upload, saveGenerated }
}
