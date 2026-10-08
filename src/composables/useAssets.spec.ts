import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Asset, Folder } from '@/types/asset'

const listImages = vi.fn()
const uploadImage = vi.fn()
const saveGenerated = vi.fn()
const editImage = vi.fn()
const listFolders = vi.fn()
const createFolder = vi.fn()
const renameFolder = vi.fn()
const deleteFolder = vi.fn()
const updateImage = vi.fn()
const deleteImage = vi.fn()

vi.mock('@/api', () => ({
  api: {
    listImages: (q: unknown) => listImages(q),
    uploadImage: (f: File, folderId?: string) => uploadImage(f, folderId),
    saveGenerated: (n: string) => saveGenerated(n),
    editImage: (n: string, o?: unknown) => editImage(n, o),
    listFolders: () => listFolders(),
    createFolder: (n: string) => createFolder(n),
    renameFolder: (id: string, n: string) => renameFolder(id, n),
    deleteFolder: (id: string) => deleteFolder(id),
    updateImage: (id: string, patch: unknown) => updateImage(id, patch),
    deleteImage: (id: string) => deleteImage(id),
  },
}))

const asset = (id: string, name: string): Asset => ({ id, name, source: 'upload', dim: '1024×768', type: 'image' })
const folder = (id: string, name: string): Folder => ({ folderId: id, folderName: name, imageCount: 0 })
const emptyCounts = { all: 0, upload: 0, aiGenerate: 0, edit: 0, object: 0, video: 0 }

// useAssets 的資料夾清單是模組層級單例（圖庫頁與彈窗共用同一份），
// 但素材清單改成每次呼叫都是獨立的一份狀態——所以每個測試只需要 resetModules
// 重設資料夾單例，素材相關的斷言不必擔心跨測試汙染。
type UseAssets = typeof import('./useAssets').useAssets
let useAssets: UseAssets

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  useAssets = (await import('./useAssets')).useAssets
})

describe('useAssets（素材清單）', () => {
  it('load 依查詢條件打 GET /images，並存下 total／counts', async () => {
    listImages.mockResolvedValue({
      total: 1,
      page: 1,
      items: [asset('a1', '圖一')],
      counts: { ...emptyCounts, all: 1 },
    })
    const { assets, total, counts, load } = useAssets()
    await load({ page: 1 })
    expect(listImages).toHaveBeenCalledWith({ page: 1 })
    expect(assets.value).toHaveLength(1)
    expect(total.value).toBe(1)
    expect(counts.value.all).toBe(1)
  })

  it('兩次呼叫 useAssets() 拿到的素材清單彼此獨立（圖庫頁與彈窗互不影響）', async () => {
    listImages
      .mockResolvedValueOnce({ total: 1, page: 1, items: [asset('a1', '圖庫頁')], counts: emptyCounts })
      .mockResolvedValueOnce({ total: 1, page: 1, items: [asset('a2', '彈窗')], counts: emptyCounts })
    const libraryView = useAssets()
    const picker = useAssets()
    await libraryView.load({ page: 1 })
    await picker.load({ pageSize: 100 })
    expect(libraryView.assets.value.map((a) => a.id)).toEqual(['a1'])
    expect(picker.assets.value.map((a) => a.id)).toEqual(['a2'])
  })

  it('upload 呼叫 uploadImage 並回傳新素材', async () => {
    uploadImage.mockResolvedValue(asset('a2', '新圖'))
    const { upload } = useAssets()
    const a = await upload(new File(['x'], '新圖.png'), 'folder_1')
    expect(uploadImage).toHaveBeenCalledWith(expect.any(File), 'folder_1')
    expect(a.id).toBe('a2')
  })

  it('saveGenerated 落地成 AI 生成素材', async () => {
    saveGenerated.mockResolvedValue({ id: 'g1', name: '生成', source: 'aiGenerate', dim: '1024×768', type: 'image' })
    const { saveGenerated: save } = useAssets()
    const a = await save('生成')
    expect(a.source).toBe('aiGenerate')
  })

  it('saveEdited 呼叫 editImage 建立編輯產物，不動原圖', async () => {
    editImage.mockResolvedValue({ id: 'e1', name: 'edited', source: 'edit', dim: '1024x768', type: 'image' })
    const { saveEdited } = useAssets()
    const a = await saveEdited('edited', { folder: 'folder_1', keepLayers: true })
    expect(editImage).toHaveBeenCalledWith('edited', { folder: 'folder_1', keepLayers: true })
    expect(a.source).toBe('edit')
  })

  describe('批次操作（後端沒有批次端點，逐筆呼叫＋allSettled 彙整）', () => {
    it('moveToFolder 全部成功時 failedIds 是空的', async () => {
      updateImage.mockResolvedValue(asset('a1', '圖一'))
      const { moveToFolder } = useAssets()
      const result = await moveToFolder(['a1', 'a2'], 'folder_1')
      expect(updateImage).toHaveBeenCalledWith('a1', { folderId: 'folder_1' })
      expect(updateImage).toHaveBeenCalledWith('a2', { folderId: 'folder_1' })
      expect(result).toEqual({ succeededIds: ['a1', 'a2'], failedIds: [] })
    })

    it('removeFromFolder 送 folderId: null（三態語意：移出到未分類）', async () => {
      updateImage.mockResolvedValue(asset('a1', '圖一'))
      const { removeFromFolder } = useAssets()
      await removeFromFolder(['a1'])
      expect(updateImage).toHaveBeenCalledWith('a1', { folderId: null })
    })

    it('deleteAssets 部分失敗時，成功與失敗的 id 分開回報，不會整批卡住', async () => {
      deleteImage.mockImplementation((id: string) =>
        id === 'a2' ? Promise.reject(new Error('ASSET_IN_USE')) : Promise.resolve({ deleted: true }),
      )
      const { deleteAssets } = useAssets()
      const result = await deleteAssets(['a1', 'a2', 'a3'])
      expect(result.succeededIds).toEqual(['a1', 'a3'])
      expect(result.failedIds).toEqual(['a2'])
    })
  })
})

describe('useAssets（資料夾清單：模組層級單例）', () => {
  it('loadFolders 填入 folders／unfiledCount，重複呼叫不重打 API', async () => {
    listFolders.mockResolvedValue({ items: [folder('f1', '春季企劃')], unfiledCount: 3 })
    const { folders, unfiledCount, loadFolders } = useAssets()
    await loadFolders()
    await loadFolders()
    expect(folders.value).toHaveLength(1)
    expect(unfiledCount.value).toBe(3)
    expect(listFolders).toHaveBeenCalledTimes(1)
  })

  it('loadFolders(force) 會強制重新載入', async () => {
    listFolders.mockResolvedValue({ items: [], unfiledCount: 0 })
    const { loadFolders } = useAssets()
    await loadFolders()
    await loadFolders(true)
    expect(listFolders).toHaveBeenCalledTimes(2)
  })

  it('addFolder 新增後重新整理資料夾清單', async () => {
    createFolder.mockResolvedValue(folder('f2', '冬季企劃'))
    listFolders.mockResolvedValue({ items: [folder('f2', '冬季企劃')], unfiledCount: 0 })
    const { folders, addFolder } = useAssets()
    const created = await addFolder('冬季企劃')
    expect(created.folderId).toBe('f2')
    expect(folders.value.map((f) => f.folderName)).toEqual(['冬季企劃'])
  })

  it('deleteFolder 回傳 imagesUnfiled 並重新整理清單', async () => {
    deleteFolder.mockResolvedValue({ deleted: true, imagesUnfiled: 2 })
    listFolders.mockResolvedValue({ items: [], unfiledCount: 2 })
    const { deleteFolder: remove } = useAssets()
    const result = await remove('f1')
    expect(result.imagesUnfiled).toBe(2)
  })
})
