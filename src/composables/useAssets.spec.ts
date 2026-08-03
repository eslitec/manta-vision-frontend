import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Asset } from '@/types/asset'

const listImages = vi.fn()
const uploadImage = vi.fn()
const saveGenerated = vi.fn()

vi.mock('@/api', () => ({
  api: {
    listImages: () => listImages(),
    uploadImage: (f: File) => uploadImage(f),
    saveGenerated: (n: string) => saveGenerated(n),
  },
}))

const asset = (id: string, name: string): Asset => ({ id, name, source: '上傳', tag: 'upload', dim: '1024×768' })

// useAssets 是模組層級單例（圖庫頁與彈窗共用同一份資料）。
// 每個測試用 resetModules 重新載入，拿到乾淨的單例狀態。
type UseAssets = typeof import('./useAssets').useAssets
let useAssets: UseAssets

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  useAssets = (await import('./useAssets')).useAssets
})

describe('useAssets', () => {
  it('load 填入素材，且重複呼叫不重打 API', async () => {
    listImages.mockResolvedValue([asset('a1', '圖一')])
    const { assets, load } = useAssets()
    await load()
    await load()
    expect(assets.value).toHaveLength(1)
    expect(listImages).toHaveBeenCalledTimes(1)
  })

  it('load(force) 會強制重新載入', async () => {
    listImages.mockResolvedValue([asset('a1', '圖一')])
    const { load } = useAssets()
    await load()
    await load(true)
    expect(listImages).toHaveBeenCalledTimes(2)
  })

  it('upload 把新素材置頂', async () => {
    listImages.mockResolvedValue([asset('a1', '舊圖')])
    uploadImage.mockResolvedValue(asset('a2', '新圖'))
    const { assets, load, upload } = useAssets()
    await load()
    await upload(new File(['x'], '新圖.png'))
    expect(assets.value[0].id).toBe('a2')
    expect(assets.value).toHaveLength(2)
  })

  it('saveGenerated 把生成結果置頂', async () => {
    listImages.mockResolvedValue([])
    saveGenerated.mockResolvedValue({ id: 'g1', name: '生成', source: 'AI 生成', tag: 'ai', dim: '1024×768' })
    const { assets, load, saveGenerated: save } = useAssets()
    await load()
    await save('生成')
    expect(assets.value[0].tag).toBe('ai')
  })
})
