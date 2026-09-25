import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerateImageReq } from '@/types/api'

// mock.ts 的 db 是模組層級的可變狀態，測試間會互相污染。
// 用 resetModules + 動態 import，讓每個測試都拿到全新、乾淨的假後端。
type MockApi = typeof import('./mock').mockApi
let api: MockApi

beforeEach(async () => {
  vi.resetModules()
  vi.useRealTimers()
  api = (await import('./mock')).mockApi
})

describe('計費與扣點', () => {
  it('generateImages 依 模型單價×張數 扣飼料', async () => {
    const before = (await api.getFeed()).balance
    const req: GenerateImageReq = {
      modelKey: 'imageStandard',
      imageId: 'img_1',
      prompt: 'x',
      count: 3,
      useBrand: false,
    }
    const res = await api.generateImages(req)
    expect(res).toHaveLength(3)
    expect(res.every((r) => r.adopted === false)).toBe(true)
    expect((await api.getFeed()).balance).toBe(before - 8 * 3)
  })

  it('餘額不足時擲出 INSUFFICIENT_FEEDS，且不扣款', async () => {
    const before = (await api.getFeed()).balance
    const req: GenerateImageReq = {
      modelKey: 'imageStandard',
      imageId: 'img_1',
      prompt: 'x',
      count: 9999,
      useBrand: false,
    }
    await expect(api.generateImages(req)).rejects.toThrow('INSUFFICIENT_FEEDS')
    expect((await api.getFeed()).balance).toBe(before)
  })

  it('generateImages 帶 regenOf 只扣一張', async () => {
    const before = (await api.getFeed()).balance
    const res = await api.generateImages({
      modelKey: 'imageStandard',
      imageId: 'img_1',
      prompt: 'x',
      count: 2,
      useBrand: false,
      regenOf: 'r_1',
    })
    expect(res).toHaveLength(1)
    expect((await api.getFeed()).balance).toBe(before - 8)
  })

  it('generateImages 找不到模型時擲出 MODEL_NOT_ALLOWED，且不扣款', async () => {
    const before = (await api.getFeed()).balance
    await expect(
      api.generateImages({ modelKey: 'nope', imageId: 'img_1', prompt: 'x', count: 2, useBrand: false }),
    ).rejects.toThrow('MODEL_NOT_ALLOWED')
    expect((await api.getFeed()).balance).toBe(before)
  })

  it('generatePost 預設輸出類型「文案＋配圖」扣 5 顆飼料', async () => {
    const before = (await api.getFeed()).balance
    await api.generatePost({ outputType: 'both', productDesc: 'x', useBrand: true })
    expect((await api.getFeed()).balance).toBe(before - 5)
  })

  it.each([
    { outputType: 'both', cost: 5 },
    { outputType: 'textOnly', cost: 0 },
    { outputType: 'imageOnly', cost: 5 },
  ] as const)('generatePost outputType=$outputType 回傳對應內容並扣 $cost 顆飼料', async ({ outputType, cost }) => {
    const before = (await api.getFeed()).balance
    const post = await api.generatePost({ outputType, productDesc: 'x', posterText: 'y', useBrand: true })
    expect((await api.getFeed()).balance).toBe(before - cost)
    if (outputType === 'both') {
      expect(post.poster).toBeTruthy()
      expect(post.copy).toBeTruthy()
    } else if (outputType === 'textOnly') {
      expect(post.poster).toBeUndefined()
      expect(post.copy).toBeTruthy()
    } else {
      expect(post.poster).toBeTruthy()
      expect(post.copy).toBeUndefined()
      expect(post.hashtags).toEqual([])
    }
  })

  it('tryOn 扣 tryonStandard 的 12 顆並回一張帶圖的結果', async () => {
    const before = (await api.getFeed()).balance
    const r = await api.tryOn({ modelSource: 'material', modelRefId: 'm1', clothImageId: 'a1' })
    expect((await api.getFeed()).balance).toBe(before - 12)
    expect(r.url).toContain('picsum')
    expect(r.generationId).toBeTruthy()
    expect((await api.listModels('tryon')).map((m) => m.costFeeds)).toEqual([12])
  })

  it('createVideoJob 扣 45 顆並回傳 pending 與 0% 進度', async () => {
    const before = (await api.getFeed()).balance
    const job = await api.createVideoJob({ template: '鏡頭推移', ratio: '9:16', modelTier: 'standard' })
    expect(job.status).toBe('pending')
    expect(job.progress).toBe(0)
    expect(job.cost).toBe(45)
    expect((await api.getFeed()).balance).toBe(before - 45)
  })

  it('createVideoJob 依生成模型倍率扣款（進階×2／專業×4）', async () => {
    const before = (await api.getFeed()).balance
    const advanced = await api.createVideoJob({ template: '鏡頭推移', ratio: '9:16', modelTier: 'advanced' })
    expect(advanced.cost).toBe(90)
    const pro = await api.createVideoJob({ template: '鏡頭推移', ratio: '9:16', modelTier: 'pro' })
    expect(pro.cost).toBe(180)
    expect((await api.getFeed()).balance).toBe(before - 90 - 180)
  })
})

describe('圖片編輯與 AI 修圖的扣款（MV-09 / MV-09b）', () => {
  it('價目表由後端提供，且回傳的是複本、改不到內部狀態', async () => {
    const pricing = await api.getEditorPricing()
    expect(pricing.tools.remove).toBe(8)
    expect(pricing.retouchOptions).toEqual({ removeObjects: 8, repair: 8, lighting: 0, upscale: 5 })
    expect(pricing.commandBase).toBe(16)
    pricing.tools.remove = 999
    expect((await api.getEditorPricing()).tools.remove).toBe(8)
  })

  it('applyEditTool 背景移除扣 8 顆，其餘工具不扣', async () => {
    const before = (await api.getFeed()).balance
    expect(await api.applyEditTool('remove')).toEqual({ tool: 'remove', cost: 8 })
    expect((await api.getFeed()).balance).toBe(before - 8)

    for (const tool of ['object', 'fade', 'text', 'crop'] as const) {
      const mid = (await api.getFeed()).balance
      expect((await api.applyEditTool(tool)).cost).toBe(0)
      expect((await api.getFeed()).balance).toBe(mid)
    }
  })

  it('retouchImage 依價目表加總後扣款，成本不採信前端', async () => {
    const before = (await api.getFeed()).balance
    const res = await api.retouchImage({ method: 'quick', options: ['removeObjects', 'repair', 'lighting'] })
    expect(res.cost).toBe(16) // 8 + 8 + 0
    expect((await api.getFeed()).balance).toBe(before - 16)
  })

  it('指令式修圖含基本費，且只認光線校正與放大兩個加購項', async () => {
    const before = (await api.getFeed()).balance
    const res = await api.retouchImage({
      method: 'command',
      options: ['removeObjects', 'repair', 'upscale'],
      instruction: '把背景換成純白',
    })
    expect(res.options).toEqual(['upscale']) // 快速項目被濾掉
    expect(res.cost).toBe(21) // 基本費 16 + 放大 5
    expect((await api.getFeed()).balance).toBe(before - 21)
  })

  it('全部選免費項目時不扣款', async () => {
    const before = (await api.getFeed()).balance
    expect((await api.retouchImage({ method: 'quick', options: ['lighting'] })).cost).toBe(0)
    expect((await api.getFeed()).balance).toBe(before)
  })

  it('另存編輯產物不扣飼料，且不覆寫原素材', async () => {
    const beforeFeed = (await api.getFeed()).balance
    const beforeCount = (await api.listImages()).total
    const saved = await api.editImage('編輯後的圖', { keepLayers: true })
    expect(saved.source).toBe('edit')
    expect(saved.editable).toBe(true)
    expect((await api.getFeed()).balance).toBe(beforeFeed)
    expect((await api.listImages()).total).toBe(beforeCount + 1)
  })

  it('餘額不足時擲出 INSUFFICIENT_FEEDS，且不扣款', async () => {
    // 先把餘額燒到接近見底，再送一筆會超支的修圖
    const { balance } = await api.getFeed()
    const req: GenerateImageReq = {
      modelKey: 'imageStandard',
      imageId: 'img_1',
      prompt: 'x',
      count: Math.floor(balance / 8),
      useBrand: false,
    }
    await api.generateImages(req)
    const left = (await api.getFeed()).balance
    await expect(api.retouchImage({ method: 'command', options: ['upscale'] })).rejects.toThrow('INSUFFICIENT_FEEDS')
    expect((await api.getFeed()).balance).toBe(left)
  })
})

describe('AI 輔助描述', () => {
  it('enhancePrompt 保留原文並補上結構化修飾詞', async () => {
    const out = await api.enhancePrompt('白T放桌上')
    expect(out).toContain('白T放桌上')
    expect(out.length).toBeGreaterThan('白T放桌上'.length)
  })

  it('enhancePrompt 空輸入也回傳可用修飾詞', async () => {
    const out = await api.enhancePrompt('   ')
    expect(out.length).toBeGreaterThan(0)
  })
})

describe('品牌套用（行銷 PO 文）', () => {
  it('useBrand=true 帶入品牌 hashtag', async () => {
    const post = await api.generatePost({ outputType: 'both', productDesc: 'x', useBrand: true })
    expect(post.hashtags).toEqual(['#日安選物', '#選物日常', '#質感生活'])
  })

  it('useBrand=false 使用預設 hashtag', async () => {
    const post = await api.generatePost({ outputType: 'both', productDesc: 'x', useBrand: false })
    expect(post.hashtags).toEqual(['#新品', '#日常'])
  })
})

describe('圖生影非同步任務', () => {
  it('未知 id 回傳 failed / NOT_FOUND', async () => {
    const j = await api.getVideoJob('job_不存在')
    expect(j.status).toBe('failed')
    expect(j.error).toBe('NOT_FOUND')
  })

  it('依經過時間由 pending → processing → done 並回傳進度', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const job = await api.createVideoJob({ template: '鏡頭推移', ratio: '9:16', modelTier: 'standard' })
    // 剛建立：pending
    const pending = await api.getVideoJob(job.id)
    expect(pending.status).toBe('pending')
    expect(pending.progress).toBeGreaterThanOrEqual(0)
    expect(pending.progress).toBeLessThanOrEqual(10)
    const baseNow = Date.now()
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(baseNow + 3000)
    const processing = await api.getVideoJob(job.id)
    expect(processing.status).toBe('processing')
    expect(processing.progress).toBeGreaterThan(0)
    expect(processing.progress).toBeLessThan(100)
    // 模擬經過 6 秒：done（跟後端狀態機對齊；delay 用 setTimeout，不受 Date.now 影響）
    nowSpy.mockReturnValue(baseNow + 6000)
    const done = await api.getVideoJob(job.id)
    expect(done.status).toBe('done')
    expect(done.progress).toBe(100)
    expect(done.resultUrl).toBeTruthy()
  })
})

describe('素材（圖庫）', () => {
  it('uploadImage 以 File 建立「上傳」來源並置頂', async () => {
    const file = new File(['x'], '新圖.png', { type: 'image/png' })
    const a = await api.uploadImage(file)
    expect(a.source).toBe('upload')
    expect(a.name).toBe('新圖.png')
    expect((await api.listImages()).items[0].id).toBe(a.id)
  })

  it('uploadImage 拒絕超過 10MB 的檔案', async () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], '太大.png')
    await expect(api.uploadImage(big)).rejects.toThrow('FILE_TOO_LARGE')
  })

  it('uploadImage 拒絕不支援的格式', async () => {
    const file = new File(['x'], '文件.pdf')
    await expect(api.uploadImage(file)).rejects.toThrow('UNSUPPORTED_FORMAT')
  })

  it('editImage 產生「編輯產物」且不覆寫原圖（非破壞）', async () => {
    const countBefore = (await api.listImages()).total
    const a = await api.editImage('原圖')
    expect(a.source).toBe('edit')
    expect(a.name).toBe('原圖')
    expect((await api.listImages()).total).toBe(countBefore + 1)
  })

  it('saveGenerated 落地成「AI 生成」素材', async () => {
    const a = await api.saveGenerated('生成結果', { generationId: 'g_x', id: 'r_x' })
    expect(a.source).toBe('aiGenerate')
  })

  it('uploadImage 帶 source=tryonModel 標成模特照、算進 upload 格，GET /images?source=tryonModel 只回模特照', async () => {
    const uploadBefore = (await api.listImages()).counts.upload
    const a = await api.uploadImage(new File(['x'], '模特.png'), undefined, undefined, undefined, 'tryonModel')
    expect(a.source).toBe('tryonModel')
    const res = await api.listImages({ source: 'tryonModel' })
    expect(res.items.map((x) => x.id)).toContain(a.id)
    expect(res.items.every((x) => x.source === 'tryonModel')).toBe(true)
    expect(res.counts.upload).toBe(uploadBefore + 1)
  })

  it('uploadImage 指定資料夾則落到該資料夾', async () => {
    const file = new File(['x'], '海報.png')
    const a = await api.uploadImage(file, 'folder_spring')
    expect(a.folderId).toBe('folder_spring')
  })

  it('uploadImage 未指定資料夾則進未分類', async () => {
    const a = await api.uploadImage(new File(['x'], '隨手拍.png'))
    expect(a.folderId).toBeUndefined()
  })

  it('listImages 依 source／mediaType／folderId／q 篩選，counts 不受篩選影響', async () => {
    const uploadsOnly = await api.listImages({ source: 'upload' })
    expect(uploadsOnly.items.every((a) => a.source === 'upload')).toBe(true)
    expect(uploadsOnly.counts.all).toBeGreaterThan(uploadsOnly.items.length) // counts 是整個圖庫，不是篩選後的子集

    const videosOnly = await api.listImages({ mediaType: 'video' })
    expect(videosOnly.items.every((a) => a.type === 'video')).toBe(true)

    const uncategorised = await api.listImages({ folderId: null })
    expect(uncategorised.items.every((a) => a.folderId === undefined)).toBe(true)

    const byKeyword = await api.listImages({ q: '春季' })
    expect(byKeyword.items.every((a) => a.name.includes('春季'))).toBe(true)
  })

  it('listImages 不帶 source 時合併內建素材：使用者的圖在前、內建在後、不重複，total＝counts.all', async () => {
    const all = await api.listImages({ pageSize: 100 })
    const firstBuiltin = all.items.findIndex((a) => a.source === 'builtin')
    expect(firstBuiltin).toBeGreaterThan(0)
    expect(all.items.slice(0, firstBuiltin).every((a) => a.source !== 'builtin')).toBe(true)
    expect(all.items.slice(firstBuiltin).every((a) => a.source === 'builtin')).toBe(true)
    expect(new Set(all.items.map((a) => a.id)).size).toBe(all.items.length)
    expect(all.total).toBe(all.counts.all)
  })

  it('listImages source=builtin 只回內建：一律圖片、沒有資料夾、帶 category，total＝counts.builtin', async () => {
    const builtin = await api.listImages({ source: 'builtin', pageSize: 100 })
    expect(builtin.items.length).toBeGreaterThan(0)
    expect(
      builtin.items.every(
        (a) => a.source === 'builtin' && a.type === 'image' && a.folderId === undefined && a.category !== undefined,
      ),
    ).toBe(true)
    expect(builtin.total).toBe(builtin.counts.builtin)
  })

  it('listImages 帶 folderId（含未分類）或 mediaType=video 都不含內建', async () => {
    const queries = [{ folderId: null }, { folderId: 'folder_spring' }, { mediaType: 'video' as const }]
    for (const q of queries) {
      const res = await api.listImages({ ...q, pageSize: 100 })
      expect(res.items.some((a) => a.source === 'builtin')).toBe(false)
    }
  })

  it('listImages source=object 含內建的物件類素材（與 counts.object 一致），不含其他類別的內建', async () => {
    const objects = await api.listImages({ source: 'object', pageSize: 100 })
    expect(objects.items.some((a) => a.source === 'object')).toBe(true)
    expect(objects.items.some((a) => a.source === 'builtin' && a.category === 'object')).toBe(true)
    expect(objects.items.every((a) => a.source === 'object' || a.category === 'object')).toBe(true)
    expect(objects.total).toBe(objects.counts.object)
  })

  it('counts：all／builtin／object 含內建，其餘桶不含，各桶加總等於 all', async () => {
    const { counts } = await api.listImages()
    const builtin = (await api.listImages({ source: 'builtin', pageSize: 100 })).items
    const builtinObjects = builtin.filter((a) => a.category === 'object').length
    const userObjects = (await api.listImages({ source: 'object', pageSize: 100 })).items.filter(
      (a) => a.source === 'object',
    ).length
    expect(counts.builtin).toBe(builtin.length)
    expect(counts.object).toBe(userObjects + builtinObjects)
    expect(counts.all).toBe(
      counts.upload +
        counts.aiGenerate +
        counts.edit +
        counts.video +
        counts.builtin +
        (counts.object - builtinObjects),
    )
  })

  it('updateImage 改名不影響 folderId（folderId 這個 key 沒帶＝不動）', async () => {
    const before = (await api.listImages({})).items.find((a) => a.id === 'a1')!
    const updated = await api.updateImage('a1', { name: '改個名字' })
    expect(updated.name).toBe('改個名字')
    expect(updated.folderId).toBe(before.folderId)
  })

  it('updateImage 傳 folderId: null 會移出到未分類', async () => {
    const updated = await api.updateImage('a1', { folderId: null })
    expect(updated.folderId).toBeUndefined()
  })

  it('deleteImage 刪除被引用中的素材會擋下（ASSET_IN_USE）', async () => {
    // a1 seed 資料 referencedBy: 2，模擬「被生成結果引用中」
    await expect(api.deleteImage('a1')).rejects.toThrow('ASSET_IN_USE')
  })

  it('deleteImage 刪除沒有被引用的素材會成功', async () => {
    const res = await api.deleteImage('a5')
    expect(res.deleted).toBe(true)
    expect((await api.listImages({})).items.some((a) => a.id === 'a5')).toBe(false)
  })
})

describe('資料夾', () => {
  it('listFolders 回傳預設資料夾與未分類數量', async () => {
    const res = await api.listFolders()
    expect(res.items.map((f) => f.folderName)).toContain('春季企劃')
    expect(res.unfiledCount).toBeGreaterThan(0)
  })

  it('createFolder 新增資料夾，重複名稱擲 DUPLICATE_NAME', async () => {
    const created = await api.createFolder('冬季企劃')
    expect(created.folderName).toBe('冬季企劃')
    await expect(api.createFolder('冬季企劃')).rejects.toThrow('DUPLICATE_NAME')
  })

  it('renameFolder 重新命名；撞名同樣擲 DUPLICATE_NAME', async () => {
    const { items } = await api.listFolders()
    const target = items.find((f) => f.folderName === '商品素材')!
    const renamed = await api.renameFolder(target.folderId, '商品照片')
    expect(renamed.folderName).toBe('商品照片')
    await expect(api.renameFolder(renamed.folderId, '生成結果')).rejects.toThrow('DUPLICATE_NAME')
  })

  it('moveToFolder（updateImage）1:N：移至資料夾會替換原本歸屬', async () => {
    // a1 原本在「春季企劃」
    await api.updateImage('a1', { folderId: 'folder_product' })
    const a1 = (await api.listImages({})).items.find((a) => a.id === 'a1')!
    expect(a1.folderId).toBe('folder_product')
  })

  it('removeFromFolder（updateImage folderId: null）1:N：移出後回到未分類', async () => {
    await api.updateImage('a1', { folderId: null })
    const a1 = (await api.listImages({})).items.find((a) => a.id === 'a1')!
    expect(a1.folderId).toBeUndefined()
  })

  it('deleteFolder 刪除資料夾會把夾內素材移回未分類，不會刪除素材本身', async () => {
    const { items } = await api.listFolders()
    const target = items.find((f) => f.folderName === '春季企劃')!
    const before = target.imageCount
    const res = await api.deleteFolder(target.folderId)
    expect(res.deleted).toBe(true)
    expect(res.imagesUnfiled).toBe(before)
    const afterList = await api.listFolders()
    expect(afterList.items.some((f) => f.folderId === target.folderId)).toBe(false)
  })
})

describe('內建素材與機器人清單', () => {
  it('listMaterials 可依 category 篩選', async () => {
    const backgrounds = await api.listMaterials('background')
    expect(backgrounds.items.every((m) => m.category === 'background')).toBe(true)
    const all = await api.listMaterials()
    expect(all.items.length).toBeGreaterThanOrEqual(backgrounds.items.length)
  })

  it('listBots 一律回陣列', async () => {
    const bots = await api.listBots()
    expect(Array.isArray(bots)).toBe(true)
    expect(bots.length).toBeGreaterThan(0)
  })
})

describe('用量與指標', () => {
  it('getUsage 依 groupBy 二選一，daily 補滿區間每一天', async () => {
    const custom = { period: 'custom' as const, startDate: '2026-07-01', endDate: '2026-07-10' }
    const day = await api.getUsage({ ...custom, groupBy: 'day' })
    expect(day.period).toEqual({ from: '2026-07-01', to: '2026-07-10' })
    expect(day.daily?.length).toBe(10)
    expect(day.daily?.[0].date).toBe('2026-07-01')
    expect(day.totalUsed).toBe(day.daily!.reduce((sum, d) => sum + d.used, 0))
    expect(day.byModule).toBeNull()
    const mod = await api.getUsage({ ...custom, groupBy: 'module' })
    expect(mod.daily).toBeNull()
    expect(mod.byModule?.map((m) => m.type)).toEqual(['generate', 'marketingImage', 'marketingText', 'video', 'tryon'])
  })

  it('generateImages 會累加本月已生成張數', async () => {
    const before = (await api.getMetrics({ period: 'month' })).monthGenerated
    await api.generateImages({ modelKey: 'imageStandard', imageId: 'img_1', prompt: 'x', count: 2, useBrand: false })
    expect((await api.getMetrics({ period: 'month' })).monthGenerated).toBe(before + 2)
  })

  const genOne = async () =>
    (
      await api.generateImages({ modelKey: 'imageStandard', imageId: 'img_1', prompt: 'x', count: 2, useBrand: false })
    )[0]

  it('recordAdoption 會拉高採用率，同一張重複採用率不變', async () => {
    const r = await genOne()
    const before = (await api.getMetrics({ period: '30d' })).adoptionRate!
    await api.recordAdoption(r)
    const after = (await api.getMetrics({ period: '30d' })).adoptionRate!
    expect(after).toBeGreaterThan(before)
    await api.recordAdoption(r)
    expect((await api.getMetrics({ period: '30d' })).adoptionRate!).toBe(after)
  })

  it('saveGenerated 帶 from 也算一次採用，之後同一張下載不重複計', async () => {
    const r = await genOne()
    const before = (await api.getMetrics({ period: '30d' })).adoptionRate!
    await api.saveGenerated('生成結果', r)
    const after = (await api.getMetrics({ period: '30d' })).adoptionRate!
    expect(after).toBeGreaterThan(before)
    await api.recordAdoption(r)
    expect((await api.getMetrics({ period: '30d' })).adoptionRate!).toBe(after)
  })

  it('下載行銷海報不算採用（採用率只算圖生圖，同後端）', async () => {
    const post = await api.generatePost({ outputType: 'imageOnly', posterText: 'y', useBrand: true })
    const before = (await api.getMetrics({ period: '30d' })).adoptionRate!
    await api.recordAdoption(post.poster!)
    expect((await api.getMetrics({ period: '30d' })).adoptionRate!).toBe(before)
  })

  it('getMetrics 的成功率不超過 100%', async () => {
    const m = await api.getMetrics({ period: '30d' })
    expect(m.successRate).toBeLessThanOrEqual(100)
    expect(m.successRate).toBeGreaterThan(0)
  })
})

describe('品牌設定持久化', () => {
  it('getBrand 回傳深拷貝，改動不會污染後端', async () => {
    const b1 = await api.getBrand()
    const original = b1.name
    b1.name = '被竄改'
    const b2 = await api.getBrand()
    expect(b2.name).toBe(original)
    expect(b2.name).not.toBe('被竄改')
  })

  it('saveBrand 後 getBrand 讀得到新值', async () => {
    const b = await api.getBrand()
    b.name = '新名字'
    await api.saveBrand(b)
    expect((await api.getBrand()).name).toBe('新名字')
  })
})

describe('肖像同意', () => {
  it('預設未同意，giveConsent 後全站生效', async () => {
    expect((await api.getConsent()).consented).toBe(false)
    await api.giveConsent()
    expect((await api.getConsent()).consented).toBe(true)
  })
})

describe('登入／登出', () => {
  it('正確帳密回傳 session', async () => {
    const session = await api.login('mavis', 'mavis123')
    expect(session).toMatchObject({ username: 'mavis', displayName: 'Mavis' })
  })

  it('假後端的 session 有 token 與 botId 欄位，但值是空的', () => {
    // 形狀要跟真後端一致，不然切過去才會發現有欄位沒填。
    // 值刻意留空字串：http 層看到空的就不送 header，符合「假模式不打真後端」。
    return api.login('mavis', 'mavis123').then((session) => {
      expect(session.token).toBe('')
      expect(session.botId).toBe('')
      expect(session.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  it('密碼錯誤時擲出 INVALID_CREDENTIALS', async () => {
    await expect(api.login('mavis', 'wrongpass')).rejects.toThrow('INVALID_CREDENTIALS')
  })

  it('帳號錯誤時擲出 INVALID_CREDENTIALS', async () => {
    await expect(api.login('wronguser', 'mavis123')).rejects.toThrow('INVALID_CREDENTIALS')
  })

  it('logout 不論是否已登入都不拋錯', async () => {
    await expect(api.logout()).resolves.toBeUndefined()
    await api.login('mavis', 'mavis123')
    await expect(api.logout()).resolves.toBeUndefined()
  })
})

describe('模型清單', () => {
  it("listModels('image') 回 3 個檔位，價格 8／12／24", async () => {
    const models = await api.listModels('image')
    expect(models.map((m) => [m.modelKey, m.costFeeds])).toEqual([
      ['imageStandard', 8],
      ['imageAdvanced', 12],
      ['imagePro', 24],
    ])
  })

  it("listModels('marketing') 回 marketingImage 5／marketingText 0", async () => {
    const models = await api.listModels('marketing')
    expect(models.map((m) => [m.modelKey, m.costFeeds])).toEqual([
      ['marketingImage', 5],
      ['marketingText', 0],
    ])
  })

  it('listInspirations 回傳 {id,name,url}', async () => {
    const items = await api.listInspirations()
    expect(items.length).toBeGreaterThan(0)
    expect(Object.keys(items[0]).sort()).toEqual(['id', 'name', 'url'])
  })
})
