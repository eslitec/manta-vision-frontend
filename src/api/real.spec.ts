import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'
import { clearAuth, http, setAuth } from './http'
import { mockApi } from './mock'
import { realApi, resetPaidRequests } from './real'
import { i18n } from '@/lang'
import type { GenerateImageReq, GeneratePostReq, TryOnReq, VideoJobReq } from '@/types/api'
import { API_ERROR_CODES, CLIENT_ERROR_CODES, hasErrorCode } from './errors'

// 跟 http.spec.ts 一樣用假 adapter 取代網路，但這裡關心的是**上一層**：
// 送出去的 URL 與 body 對不對、後端的回應有沒有被正確翻成 Session。

interface Recorded {
  url: string
  body: unknown
  method?: string
  params?: unknown
  headers?: Record<string, unknown>
  timeout?: number
  /** 原始 body（字串）：後端比對的是 body 的 bytes，重送時要逐字相同 */
  raw?: unknown
}

/** error：請求沒送達（不帶 response），讓 toApiError 翻成 TIMEOUT／NETWORK_ERROR；delay：回應前先等幾毫秒 */
type Reply = { status?: number; data?: unknown; error?: 'timeout' | 'network'; delay?: number }

/**
 * 依 URL 回傳對應的假回應；同時記下每一次請求，供斷言檢查。
 * 給陣列時依序回應，用到最後一個就一直重複它。
 */
function stubRoutes(routes: Record<string, Reply | Reply[]>) {
  const calls: Recorded[] = []

  const adapter: AxiosAdapter = async (config: AxiosRequestConfig) => {
    const url = config.url ?? ''
    calls.push({
      url,
      method: config.method,
      params: config.params,
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      headers: JSON.parse(JSON.stringify(config.headers ?? {})),
      timeout: config.timeout,
      raw: config.data,
    })

    const entry = routes[url]
    const route = Array.isArray(entry) ? (entry.length > 1 ? entry.shift() : entry[0]) : entry
    if (!route) throw new Error(`測試沒有為 ${url} 準備回應`)
    if (route.delay) await new Promise((resolve) => setTimeout(resolve, route.delay))

    if (route.error) {
      const error = new Error(route.error) as Error & { isAxiosError: boolean; code?: string }
      error.isAxiosError = true
      if (route.error === 'timeout') error.code = 'ECONNABORTED'
      throw error
    }

    const response = {
      status: route.status ?? 200,
      statusText: '',
      data: route.data,
      headers: {},
      config,
    } as AxiosResponse

    if (response.status >= 400) {
      const error = new Error('request failed') as Error & {
        isAxiosError: boolean
        response: AxiosResponse
      }
      error.isAxiosError = true
      error.response = response
      throw error
    }

    return response
  }

  http.defaults.adapter = adapter
  return calls
}

const LOGIN_OK = {
  data: {
    token: 'jwt-abc',
    role: 'admin',
    expiresIn: 604800,
    userId: 'usr_1',
    botId: 'bot_1',
  },
}

beforeEach(() => {
  // 憑證效期算的是「現在 + expiresIn」，時間不凍住就沒辦法精確斷言
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  http.defaults.adapter = undefined
  clearAuth()
  resetPaidRequests() // 沒定案的 key 是模組層級的，不清會漏到下一個測試
})

describe('login', () => {
  it('打 /auth/login 並帶上帳密', async () => {
    const calls = stubRoutes({ '/auth/login': LOGIN_OK })

    await realApi.login('mavis', 'mavis123')

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/auth/login')
    expect(calls[0].body).toEqual({ username: 'mavis', password: 'mavis123' })
  })

  it('把後端回應翻成 Session，並把 expiresIn 換算成絕對時間', async () => {
    stubRoutes({ '/auth/login': LOGIN_OK })

    const session = await realApi.login('mavis', 'mavis123')

    expect(session).toEqual({
      username: 'mavis',
      // 後端沒有顯示名稱這個欄位，帳號本身就是顯示名稱
      displayName: 'mavis',
      token: 'jwt-abc',
      botId: 'bot_1',
      role: 'admin',
      // 存絕對時間而非剩餘秒數，重新整理後才判斷得出來還有沒有效
      expiresAt: Date.parse('2026-01-01T00:00:00Z') + 604800 * 1000,
    })
  })

  it('帳密錯誤時把 ApiError 往上丟，不吞掉', async () => {
    stubRoutes({
      '/auth/login': {
        status: 401,
        data: {
          code: 'INVALID_CREDENTIALS',
          message: '帳號或密碼錯誤',
          fieldErrors: null,
          requestId: 'req_1',
        },
      },
    })

    await expect(realApi.login('mavis', 'wrong')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
  })
})

describe('register', () => {
  it('註冊完會自動登入一次——後端的註冊回應不含 token', async () => {
    const calls = stubRoutes({
      '/auth/register': { status: 201, data: { userId: 'usr_2', botId: 'bot_2' } },
      '/auth/login': LOGIN_OK,
    })

    const session = await realApi.register('newbie', 'secret123')

    expect(calls.map((c) => c.url)).toEqual(['/auth/register', '/auth/login'])
    // 補登入用的是同一組帳密，不是註冊回應裡的 userId
    expect(calls[1].body).toEqual({ username: 'newbie', password: 'secret123' })
    expect(session.token).toBe('jwt-abc')
  })

  it('帳號被用走時不會再去打登入', async () => {
    const calls = stubRoutes({
      '/auth/register': {
        status: 409,
        data: {
          code: 'USERNAME_TAKEN',
          message: '此帳號已被註冊',
          fieldErrors: null,
          requestId: 'req_2',
        },
      },
    })

    await expect(realApi.register('mavis', 'secret123')).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
    })
    expect(calls.map((c) => c.url)).toEqual(['/auth/register'])
  })
})

describe('logout', () => {
  it('打 /auth/logout 讓後端把這張 token 加進黑名單', async () => {
    const calls = stubRoutes({ '/auth/logout': { data: {} } })

    await realApi.logout()

    expect(calls.map((c) => c.url)).toEqual(['/auth/logout'])
  })
})

describe('尚未接上的方法', () => {
  it('後端還沒實作的端點沿用假資料，不會是 undefined', async () => {
    // realApi 是 { ...mockApi, login, register, logout, ... }。這個測試釘住那個
    // 展開——有人把它拿掉的話，整站會在執行期才炸「api.editImage is not a
    // function」，而不是在這裡。
    // 圖庫「編輯產物」目前後端沒有對應端點，仍然吃假資料
    expect(typeof realApi.editImage).toBe('function')
  })

  it('已接上的方法不是 mock 的那一份', () => {
    // 有人把方法從 realApi 拿掉時，`...mockApi` 會默默補上假資料——這裡會變紅
    expect(realApi.getFeed).not.toBe(mockApi.getFeed)
    expect(realApi.getUsage).not.toBe(mockApi.getUsage)
    expect(realApi.getMetrics).not.toBe(mockApi.getMetrics)
    expect(realApi.listModels).not.toBe(mockApi.listModels)
    expect(realApi.enhancePrompt).not.toBe(mockApi.enhancePrompt)
    expect(realApi.generateImages).not.toBe(mockApi.generateImages)
    expect(realApi.generatePost).not.toBe(mockApi.generatePost)
    expect(realApi.saveGenerated).not.toBe(mockApi.saveGenerated)
    expect(realApi.recordAdoption).not.toBe(mockApi.recordAdoption)
    expect(realApi.listInspirations).not.toBe(mockApi.listInspirations)
    expect(realApi.tryOn).not.toBe(mockApi.tryOn)
    expect(realApi.retouchImage).not.toBe(mockApi.retouchImage)
    expect(realApi.getConsent).not.toBe(mockApi.getConsent)
    expect(realApi.giveConsent).not.toBe(mockApi.giveConsent)
    expect(realApi.createVideoJob).not.toBe(mockApi.createVideoJob)
    expect(realApi.getVideoJob).not.toBe(mockApi.getVideoJob)
    expect(realApi.listVideoJobs).not.toBe(mockApi.listVideoJobs)
  })

  it('儲值在真後端模式明確停用（TopUpDialog 走「不支援」分支）', () => {
    expect(realApi.topUpFeed).toBeUndefined()
    // 證明不是 mock 本來就沒有這支
    expect(typeof mockApi.topUpFeed).toBe('function')
  })
})

describe('GET /bots', () => {
  it('回傳陣列並把 botId／botName 原樣帶出', async () => {
    stubRoutes({
      '/bots': { data: { items: [{ botId: 'bot_1', botName: '日安選物' }] } },
    })

    const bots = await realApi.listBots()

    expect(bots).toEqual([{ botId: 'bot_1', botName: '日安選物' }])
  })
})

const WIRE_IMAGE = {
  imageId: 'img_1',
  imageName: '春季主視覺_01',
  url: 'https://cdn.example.com/img_1.jpg',
  mediaType: 'image',
  source: 'upload',
  folderId: null,
  isInUse: false,
  createdAt: '2026-01-01T00:00:00Z',
  width: 1024,
  height: 768,
}

describe('圖庫（images）', () => {
  it('listImages 把後端分頁回應翻成內部 Asset 形狀，folderId: null 正規化成 undefined', async () => {
    const calls = stubRoutes({
      '/images': {
        data: {
          total: 1,
          page: 1,
          items: [WIRE_IMAGE],
          counts: { all: 1, upload: 1, aiGenerate: 0, edit: 0, object: 0, video: 0 },
        },
      },
    })

    const res = await realApi.listImages({ page: 1, source: 'upload' })

    expect(calls[0].params).toMatchObject({ page: 1, pageSize: 8, source: 'upload' })
    expect(res.total).toBe(1)
    expect(res.items[0]).toMatchObject({
      id: 'img_1',
      name: '春季主視覺_01',
      source: 'upload',
      type: 'image',
      folderId: undefined,
      url: WIRE_IMAGE.url,
      referencedBy: 0,
      dim: '1024×768',
      width: 1024,
      height: 768,
    })
  })

  it('listImages 對量不出寬高的舊資料，dim 回空字串而不是 "null×null"，width／height 正規化成 undefined', async () => {
    stubRoutes({
      '/images': {
        data: {
          total: 1,
          page: 1,
          items: [{ ...WIRE_IMAGE, width: null, height: null }],
          counts: { all: 1, upload: 1, aiGenerate: 0, edit: 0, object: 0, video: 0 },
        },
      },
    })

    const res = await realApi.listImages()

    expect(res.items[0].dim).toBe('')
    expect(res.items[0].width).toBeUndefined()
    expect(res.items[0].height).toBeUndefined()
  })

  it('listImages 的 folderId 三態：null 篩「未分類」時送字面值 "null"', async () => {
    const calls = stubRoutes({
      '/images': {
        data: {
          total: 0,
          page: 1,
          items: [],
          counts: { all: 0, upload: 0, aiGenerate: 0, edit: 0, object: 0, video: 0 },
        },
      },
    })

    await realApi.listImages({ folderId: null })

    expect(calls[0].params).toMatchObject({ folderId: 'null' })
  })

  it('listImages 的 source=builtin 原樣送給後端，內建素材投影的 category 帶進 Asset、images 的 null 正規化成 undefined', async () => {
    const calls = stubRoutes({
      '/images': {
        data: {
          total: 2,
          page: 1,
          items: [
            { ...WIRE_IMAGE, imageId: 'mat_1', source: 'builtin', folderId: null, category: 'object' },
            { ...WIRE_IMAGE, category: null },
          ],
          counts: { all: 2, upload: 1, aiGenerate: 0, edit: 0, object: 1, video: 0, builtin: 1 },
        },
      },
    })

    const res = await realApi.listImages({ source: 'builtin' })

    expect(calls[0].params).toMatchObject({ source: 'builtin' })
    expect(res.counts.builtin).toBe(1)
    expect(res.items[0]).toMatchObject({ id: 'mat_1', source: 'builtin', category: 'object', folderId: undefined })
    expect(res.items[1].category).toBeUndefined()
  })

  it('uploadImage 送 multipart，帶了 folderId 才會出現在表單裡', async () => {
    const calls = stubRoutes({ '/upload': { status: 201, data: WIRE_IMAGE } })

    const file = new File(['x'], 'test.png')
    const asset = await realApi.uploadImage(file, 'folder_1')

    expect(calls[0].url).toBe('/upload')
    const form = calls[0].body as FormData
    expect(form.get('file')).toBe(file)
    expect(form.get('folderId')).toBe('folder_1')
    expect(asset.id).toBe('img_1')
  })

  it('uploadImage 不帶 folderId 時表單不會出現這個欄位（後端就落在未分類）', async () => {
    const calls = stubRoutes({ '/upload': { status: 201, data: WIRE_IMAGE } })

    await realApi.uploadImage(new File(['x'], 'test.png'))

    const form = calls[0].body as FormData
    expect(form.get('folderId')).toBeNull()
  })

  it('uploadImage 帶了 imageName 才會出現在表單裡（另存為新素材用對話框輸入的名稱）', async () => {
    const calls = stubRoutes({ '/upload': { status: 201, data: WIRE_IMAGE } })

    await realApi.uploadImage(new File(['x'], 'crop.png'), undefined, 'img_0', '裁切版')

    const form = calls[0].body as FormData
    expect(form.get('sourceImageId')).toBe('img_0')
    expect(form.get('imageName')).toBe('裁切版')
    expect(form.get('source')).toBeNull()
    expect(calls[0].url).toBe('/upload')
  })

  it('uploadImage 帶 source=tryonModel 時表單多一個 source 欄位（試穿頁的模特照），回應的來源原樣帶出', async () => {
    const calls = stubRoutes({ '/upload': { status: 201, data: { ...WIRE_IMAGE, source: 'tryonModel' } } })

    const asset = await realApi.uploadImage(new File(['x'], 'model.png'), undefined, undefined, undefined, 'tryonModel')

    const form = calls[0].body as FormData
    expect(form.get('source')).toBe('tryonModel')
    expect(form.get('sourceImageId')).toBeNull()
    expect(asset.source).toBe('tryonModel')
  })

  it('updateImage 只帶 name 時，body 不會有 folderId 這個 key（三態語意：不動）', async () => {
    const calls = stubRoutes({ '/images/img_1': { data: WIRE_IMAGE } })

    await realApi.updateImage('img_1', { name: '新名字' })

    expect(calls[0].body).toEqual({ imageName: '新名字' })
    expect('folderId' in (calls[0].body as object)).toBe(false)
  })

  it('updateImage 帶 folderId: null 時，body 明確送出 null（移出未分類）', async () => {
    const calls = stubRoutes({ '/images/img_1': { data: WIRE_IMAGE } })

    await realApi.updateImage('img_1', { folderId: null })

    expect(calls[0].body).toEqual({ folderId: null })
  })

  it('deleteImage 打 DELETE /images/{id}', async () => {
    const calls = stubRoutes({ '/images/img_1': { data: { deleted: true } } })

    const res = await realApi.deleteImage('img_1')

    expect(calls[0].method).toBe('delete')
    expect(res.deleted).toBe(true)
  })
})

describe('資料夾（folders）', () => {
  it('listFolders 直接沿用後端形狀（欄位已經是 camelCase，不需要轉換）', async () => {
    stubRoutes({
      '/folders': { data: { items: [{ folderId: 'f1', folderName: '春季企劃', imageCount: 3 }], unfiledCount: 2 } },
    })

    const res = await realApi.listFolders()

    expect(res).toEqual({ items: [{ folderId: 'f1', folderName: '春季企劃', imageCount: 3 }], unfiledCount: 2 })
  })

  it('createFolder 送 { folderName }', async () => {
    const calls = stubRoutes({
      '/folders': { status: 201, data: { folderId: 'f2', folderName: '冬季企劃', imageCount: 0 } },
    })

    const folder = await realApi.createFolder('冬季企劃')

    expect(calls[0].body).toEqual({ folderName: '冬季企劃' })
    expect(folder.folderId).toBe('f2')
  })

  it('renameFolder 打 PUT /folders/{id}', async () => {
    const calls = stubRoutes({
      '/folders/f1': { data: { folderId: 'f1', folderName: '商品照片', imageCount: 3 } },
    })

    const folder = await realApi.renameFolder('f1', '商品照片')

    expect(calls[0].method).toBe('put')
    expect(calls[0].body).toEqual({ folderName: '商品照片' })
    expect(folder.folderName).toBe('商品照片')
  })

  it('deleteFolder 打 DELETE /folders/{id}，回傳 imagesUnfiled', async () => {
    stubRoutes({ '/folders/f1': { data: { deleted: true, imagesUnfiled: 4 } } })

    const res = await realApi.deleteFolder('f1')

    expect(res).toEqual({ deleted: true, imagesUnfiled: 4 })
  })
})

const WIRE_BRAND = {
  brandId: 'brand_1',
  name: '日安選物',
  positioning: '質感選物店',
  industry: 'apparel',
  website: 'www.rihan-select.com',
  customerAddress: '你',
  tone: ['溫暖'],
  hashtags: ['#日安選物'],
  avoidWords: '廉價、瑕疵',
  colorPalette: { primary: '#2e3567', secondary: '#a5c8e6' },
  logoImageId: 'img_logo',
  logoUrl: 'https://cdn.example.com/logos/logo_1.png',
  portraitConsentTemplate: '本人同意…',
  imageLicense: '僅供本品牌使用。',
  isComplete: true,
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('品牌設定（brand）', () => {
  it('getBrand 把後端形狀翻成 BrandProfile：avoidWords 原樣帶入字串、colorPalette 拆成三個色票', async () => {
    stubRoutes({ '/brand': { data: WIRE_BRAND } })

    const profile = await realApi.getBrand()

    expect(profile).toMatchObject({
      name: '日安選物',
      positioning: '質感選物店',
      industry: 'apparel',
      website: 'www.rihan-select.com',
      addressing: '你',
      tones: ['溫暖'],
      hashtags: ['#日安選物'],
      avoidWords: '廉價、瑕疵',
      colors: [
        { label: '主色', hex: '#2E3567' },
        { label: '輔色', hex: '#A5C8E6' },
      ],
      logoUrl: 'https://cdn.example.com/logos/logo_1.png',
      logoName: 'logo_1.png',
      portraitConsent: '本人同意…',
      imageLicense: '僅供本品牌使用。',
    })
  })

  it('getBrand 遇到從沒設定過的 null／空殼欄位，會正規化成空字串／空陣列', async () => {
    stubRoutes({
      '/brand': {
        data: {
          ...WIRE_BRAND,
          name: null,
          positioning: null,
          website: null,
          customerAddress: null,
          tone: null,
          hashtags: null,
          avoidWords: null,
          colorPalette: null,
          logoUrl: null,
          portraitConsentTemplate: null,
          imageLicense: null,
        },
      },
    })

    const profile = await realApi.getBrand()

    expect(profile).toMatchObject({
      name: '',
      positioning: '',
      website: '',
      addressing: '',
      tones: [],
      hashtags: [],
      avoidWords: '',
      colors: [],
      logoUrl: '',
      logoName: '',
      portraitConsent: '',
      imageLicense: '',
    })
  })

  const BASE_PROFILE = {
    name: '日安選物',
    positioning: '質感選物店',
    website: '',
    industry: 'apparel',
    colors: [
      { label: '主色', hex: '#2e3567' },
      { label: '輔色', hex: '#a5c8e6' },
    ],
    tones: ['溫暖'],
    hashtags: ['#日安選物'],
    addressing: '',
    avoidWords: '廉價、瑕疵',
    logoName: '',
    logoUrl: '',
    portraitConsent: '',
    imageLicense: '',
  }

  it('saveBrand 把 avoidWords 字串原樣帶到 PUT body、colors 依索引對到 primary／secondary／accent', async () => {
    const calls = stubRoutes({ '/brand': { data: WIRE_BRAND } })

    await realApi.saveBrand(BASE_PROFILE)

    expect(calls[0].method).toBe('put')
    expect(calls[0].body).toMatchObject({
      name: '日安選物',
      positioning: '質感選物店',
      industry: 'apparel',
      avoidWords: '廉價、瑕疵',
      colorPalette: { primary: '#2E3567', secondary: '#A5C8E6' },
    })
  })

  it('saveBrand 三態語意：空字串欄位送 null（明確清空），不是不送這個 key', async () => {
    const calls = stubRoutes({ '/brand': { data: WIRE_BRAND } })

    await realApi.saveBrand(BASE_PROFILE)

    const body = calls[0].body as Record<string, unknown>
    expect(body.website).toBeNull()
    expect(body.customerAddress).toBeNull()
    expect(body.portraitConsentTemplate).toBeNull()
    expect(body.imageLicense).toBeNull()
  })

  it('saveBrand 的 logoUrl 是 data: URL 時，先 POST /upload 拿 imageId，PUT /brand 才帶 logoImageId', async () => {
    const calls = stubRoutes({
      '/upload': { status: 201, data: { ...WIRE_IMAGE, imageId: 'img_new_logo' } },
      '/brand': { data: WIRE_BRAND },
    })

    await realApi.saveBrand({ ...BASE_PROFILE, logoName: 'logo.png', logoUrl: 'data:image/png;base64,AAAA' })

    expect(calls.map((c) => c.url)).toEqual(['/upload', '/brand'])
    expect((calls[1].body as Record<string, unknown>).logoImageId).toBe('img_new_logo')
  })

  it('saveBrand 上傳 Logo 途中換帳號：丟 SESSION_CHANGED，不拿下一個帳號的憑證 PUT /brand', async () => {
    setAuth({ token: 'token_a', botId: 'bot_a' })
    const calls = stubRoutes({
      '/upload': { status: 201, data: { ...WIRE_IMAGE, imageId: 'img_new_logo' }, delay: 10_000 },
      '/brand': { data: WIRE_BRAND },
    })

    const a = expect(
      realApi.saveBrand({ ...BASE_PROFILE, logoName: 'logo.png', logoUrl: 'data:image/png;base64,AAAA' }),
    ).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    await vi.advanceTimersByTimeAsync(1000)
    clearAuth()
    setAuth({ token: 'token_b', botId: 'bot_b' })
    await vi.advanceTimersByTimeAsync(20_000)
    await a

    expect(calls.map((c) => c.url)).toEqual(['/upload'])
  })

  it('saveBrand 新上傳 Logo 後 PUT /brand 失敗：刪掉剛上傳的孤兒圖，丟回原本的錯誤', async () => {
    const calls = stubRoutes({
      '/upload': { status: 201, data: { ...WIRE_IMAGE, imageId: 'img_new_logo' } },
      '/brand': { status: 422, data: { code: 'VALIDATION_ERROR', message: '欄位錯誤', requestId: 'r1' } },
      '/images/img_new_logo': { data: { deleted: true } },
    })

    await expect(
      realApi.saveBrand({ ...BASE_PROFILE, logoName: 'logo.png', logoUrl: 'data:image/png;base64,AAAA' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'post /upload',
      'put /brand',
      'delete /images/img_new_logo',
    ])
  })

  it('saveBrand PUT /brand 途中換帳號後失敗：不拿下一個帳號的憑證刪上一個人的 Logo', async () => {
    setAuth({ token: 'token_a', botId: 'bot_a' })
    const calls = stubRoutes({
      '/upload': { status: 201, data: { ...WIRE_IMAGE, imageId: 'img_new_logo' } },
      '/brand': { status: 500, data: { code: 'INTERNAL_ERROR', message: '壞了', requestId: 'r1' }, delay: 10_000 },
      '/images/img_new_logo': { data: { deleted: true } },
    })

    const a = expect(
      realApi.saveBrand({ ...BASE_PROFILE, logoName: 'logo.png', logoUrl: 'data:image/png;base64,AAAA' }),
    ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' })
    await vi.advanceTimersByTimeAsync(1000)
    clearAuth()
    setAuth({ token: 'token_b', botId: 'bot_b' })
    await vi.advanceTimersByTimeAsync(20_000)
    await a

    expect(calls.map((c) => c.url)).toEqual(['/upload', '/brand'])
  })

  it('saveBrand 的 logoUrl 是空字串（使用者清空 Logo）時，logoImageId 明確送 null', async () => {
    const calls = stubRoutes({ '/brand': { data: WIRE_BRAND } })

    await realApi.saveBrand({ ...BASE_PROFILE, logoUrl: '' })

    expect((calls[0].body as Record<string, unknown>).logoImageId).toBeNull()
  })

  it('saveBrand 的 logoUrl 已經是後端網址（沒有換過 Logo）時，body 不會有 logoImageId 這個 key（三態：不動）', async () => {
    const calls = stubRoutes({ '/brand': { data: WIRE_BRAND } })

    await realApi.saveBrand({ ...BASE_PROFILE, logoUrl: 'https://cdn.example.com/logos/logo_1.png' })

    expect('logoImageId' in (calls[0].body as object)).toBe(false)
  })

  it('saveBrand 回傳存檔後的最新內容（例如換成真正的 Logo 網址），供呼叫端寫回 store', async () => {
    stubRoutes({ '/brand': { data: WIRE_BRAND } })

    const saved = await realApi.saveBrand(BASE_PROFILE)

    expect(saved.logoUrl).toBe('https://cdn.example.com/logos/logo_1.png')
  })
})

describe('內建素材（materials）', () => {
  it('listMaterials 有帶 category 時放進 params，沒帶就不送', async () => {
    const calls = stubRoutes({
      '/materials': {
        data: { items: [{ materialId: 'm1', materialName: '白色背景', category: 'background', url: '' }] },
      },
    })

    await realApi.listMaterials('background')
    await realApi.listMaterials()

    expect(calls[0].params).toEqual({ category: 'background' })
    expect(calls[1].params).toBeUndefined()
  })
})

// ── 飼料、模型價格、輔助描述 ──

describe('GET /feeds', () => {
  it('回整包錢包摘要，monthlyLimit 的 null（無上限）原樣保留', async () => {
    const wire = { balance: 1224, monthlyLimit: null, monthUsed: 0, estImages: 153, estVideos: 27 }
    const calls = stubRoutes({ '/feeds': { data: wire } })

    const feed = await realApi.getFeed()

    expect(calls[0].url).toBe('/feeds')
    expect(feed).toEqual(wire)
  })
})

describe('GET /feeds/usage 與 GET /metrics', () => {
  const USAGE_DAY = {
    period: { from: '2026-09-01', to: '2026-09-22' },
    totalUsed: 16,
    dailyAvg: 1,
    vsLastMonthPct: null,
    byModule: null,
    daily: [
      { date: '2026-09-01', used: 0 },
      { date: '2026-09-02', used: 16 },
    ],
  }

  it('getUsage：custom 帶起訖日、groupBy 與瀏覽器時區，回應原樣回傳（null 不被改成 0）', async () => {
    const calls = stubRoutes({ '/feeds/usage': { data: USAGE_DAY } })

    const usage = await realApi.getUsage({
      period: 'custom',
      startDate: '2026-09-01',
      endDate: '2026-09-22',
      groupBy: 'day',
    })

    expect(calls[0].url).toBe('/feeds/usage')
    expect(calls[0].params).toEqual({
      period: 'custom',
      startDate: '2026-09-01',
      endDate: '2026-09-22',
      groupBy: 'day',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    expect(usage).toEqual(USAGE_DAY)
    expect(usage.vsLastMonthPct).toBeNull()
    expect(usage.byModule).toBeNull()
  })

  it('getUsage：預設區間只帶 period／groupBy／timezone，不帶起訖日', async () => {
    const calls = stubRoutes({ '/feeds/usage': { data: { ...USAGE_DAY, daily: null, byModule: [] } } })

    await realApi.getUsage({ period: 'month', groupBy: 'module' })

    expect(Object.keys(calls[0].params as object).sort()).toEqual(['groupBy', 'period', 'timezone'])
    expect(calls[0].params).toMatchObject({ period: 'month', groupBy: 'module' })
  })

  it('getMetrics：打 /metrics 帶期間與時區，四指標的 null 原樣保留', async () => {
    const wire = {
      period: { from: '2026-08-24', to: '2026-09-22' },
      successRate: 100,
      adoptionRate: null,
      avgRegenerate: null,
      costPerAdopted: null,
      vsLastPeriod: { successRate: null, adoptionRate: null, avgRegenerate: null, costPerAdopted: null },
      monthGenerated: 2,
    }
    const calls = stubRoutes({ '/metrics': { data: wire } })

    const metrics = await realApi.getMetrics({ period: '30d' })

    expect(calls[0].url).toBe('/metrics')
    expect(calls[0].params).toEqual({ period: '30d', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    expect(metrics).toEqual(wire)
    expect(metrics.adoptionRate).toBeNull()
  })
})

describe('GET /ai-models', () => {
  it('帶 modelType 查詢並原樣回傳 items', async () => {
    const items = [{ modelKey: 'imageStandard', name: '標準', modelType: 'image', costFeeds: 8 }]
    const calls = stubRoutes({ '/ai-models': { data: { items } } })

    const models = await realApi.listModels('image')

    expect(calls[0].params).toEqual({ modelType: 'image' })
    expect(models).toEqual(items)
  })
})

describe('POST /prompt/enhance', () => {
  it('送 target=image，回 enhancedPrompt，不帶 Idempotency-Key', async () => {
    const calls = stubRoutes({ '/prompt/enhance': { data: { enhancedPrompt: '白T放木桌上，自然光' } } })

    const out = await realApi.enhancePrompt('白T')

    expect(calls[0].body).toEqual({ target: 'image', prompt: '白T' })
    expect(calls[0].headers?.['Idempotency-Key']).toBeUndefined()
    expect(calls[0].timeout).toBe(40000)
    expect(out).toBe('白T放木桌上，自然光')
  })
})

// ── 付費生成：冪等鍵、重送、202 輪詢 ──

const GEN_REQ: GenerateImageReq = {
  modelKey: 'imageStandard',
  imageId: 'img_1',
  prompt: '白T',
  count: 2,
  useBrand: false,
}
const WIRE_RESULT = {
  resultId: 'res_1',
  tempUrl: 'https://r2.example.com/results/bot_1/a.png',
  expiresAt: '2026-01-02T00:00:00Z',
  seed: 1,
}
const GEN_OK = {
  data: { generationId: 'gen_1', results: [WIRE_RESULT], durationMs: 4210, costFeeds: 16, balance: 1224 },
}
const PENDING = { status: 202, data: { generationId: 'gen_1', status: 'processing', pollAfterMs: 5000 } }
const PROCESSING = {
  data: {
    generationId: 'gen_1',
    type: 'generate',
    status: 'processing',
    results: [],
    durationMs: null,
    costFeeds: 16,
    balance: 1224,
  },
}
const DONE = { data: { ...PROCESSING.data, status: 'done', results: [WIRE_RESULT], durationMs: 90000 } }
const FAILED = { data: { ...PROCESSING.data, status: 'failed' } }
const CONFLICT = {
  status: 409,
  data: {
    code: 'IDEMPOTENCY_IN_PROGRESS',
    message: '前一次相同的請求還在處理中，請稍候',
    fieldErrors: null,
    requestId: 'r',
  },
}
const GENERATED = [{ id: 'res_1', generationId: 'gen_1', url: WIRE_RESULT.tempUrl, adopted: false }]
const keysOf = (calls: Recorded[]) => calls.map((c) => c.headers?.['Idempotency-Key'])

describe('POST /generate', () => {
  it('200：body 用後端欄位名、帶 Idempotency-Key、timeout 100 秒，結果翻成 GeneratedImage', async () => {
    const calls = stubRoutes({ '/generate': GEN_OK })

    const res = await realApi.generateImages(GEN_REQ)

    expect(calls[0].body).toEqual(GEN_REQ)
    expect(calls[0].headers?.['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[0].timeout).toBe(100000)
    expect(res).toEqual(GENERATED)
  })

  it('沒有參考圖（純文字生圖）：body 不含 imageId 與 strength', async () => {
    const calls = stubRoutes({ '/generate': GEN_OK })
    const textOnly: GenerateImageReq = { modelKey: 'imageStandard', prompt: '白T', count: 2, useBrand: false }

    await realApi.generateImages({ ...textOnly, strength: undefined })

    expect(calls[0].body).toStrictEqual(textOnly)
    expect(Object.keys(calls[0].body as object)).not.toContain('strength')
  })

  it('202 → 每 pollAfterMs 輪詢 GET /generations/{id} 直到 done，不會再送 /generate', async () => {
    const calls = stubRoutes({ '/generate': PENDING, '/generations/gen_1': [PROCESSING, DONE] })

    const p = realApi.generateImages(GEN_REQ)
    await vi.advanceTimersByTimeAsync(5000)
    expect(calls.map((c) => c.url)).toEqual(['/generate', '/generations/gen_1'])
    await vi.advanceTimersByTimeAsync(5000)

    await expect(p).resolves.toEqual(GENERATED)
    expect(calls.filter((c) => c.url === '/generate')).toHaveLength(1)
  })

  it('輪詢到 failed → GENERATION_FAILED，訊息不叫人原樣重送（202 後被審核擋下照樣扣點）', async () => {
    stubRoutes({ '/generate': PENDING, '/generations/gen_1': FAILED })

    const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({
      code: 'GENERATION_FAILED',
      message: expect.stringContaining('飼料不會退回'),
    })
    await vi.advanceTimersByTimeAsync(5000)

    await assertion
  })

  it('前端合成的訊息跟著語系走', async () => {
    stubRoutes({ '/generate': PENDING, '/generations/gen_1': FAILED })
    i18n.global.locale.value = 'en'
    try {
      const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({
        message: expect.stringContaining('content moderation'),
      })
      await vi.advanceTimersByTimeAsync(5000)
      await assertion
    } finally {
      i18n.global.locale.value = 'zh-Hant'
    }
  })

  it('輪詢超過 11 分鐘仍 processing → GENERATION_STILL_PROCESSING 並停止輪詢', async () => {
    const calls = stubRoutes({ '/generate': PENDING, '/generations/gen_1': PROCESSING })

    const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({
      code: 'GENERATION_STILL_PROCESSING',
      message: expect.stringContaining('gen_1'),
    })
    await vi.advanceTimersByTimeAsync(12 * 60_000)
    await assertion

    const n = calls.length
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(n)
  })

  it('輪詢遇到 5xx（代理吐的 HTML 502）繼續等下一輪', async () => {
    const calls = stubRoutes({
      '/generate': PENDING,
      '/generations/gen_1': [{ status: 502, data: '<html>bad gateway</html>' }, DONE],
    })

    const p = realApi.generateImages(GEN_REQ)
    await vi.advanceTimersByTimeAsync(2 * 5000)

    await expect(p).resolves.toEqual(GENERATED)
    expect(calls.filter((c) => c.url === '/generate')).toHaveLength(1)
  })

  it('逾時後自動重送沿用同一把 key 與同一份 body', async () => {
    const calls = stubRoutes({ '/generate': [{ error: 'timeout' }, GEN_OK] })

    const p = realApi.generateImages(GEN_REQ)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(p).resolves.toEqual(GENERATED)
    expect(calls).toHaveLength(2)
    expect(calls[1].headers?.['Idempotency-Key']).toBe(calls[0].headers?.['Idempotency-Key'])
    expect(calls[1].raw).toBe(calls[0].raw)
  })

  it('409 IDEMPOTENCY_IN_PROGRESS 也用同一把 key 重送', async () => {
    const calls = stubRoutes({ '/generate': [CONFLICT, GEN_OK] })

    const p = realApi.generateImages(GEN_REQ)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(p).resolves.toEqual(GENERATED)
    expect(calls).toHaveLength(2)
    expect(new Set(keysOf(calls)).size).toBe(1)
  })

  it('斷線後 409 持續 60 秒才回 GEN_OK，仍然 resolve，而且只用一把 key', async () => {
    // 回應在路上遺失、後端還要跑一陣子：409 若算進 3 次上限，這條會紅
    const calls = stubRoutes({ '/generate': [{ error: 'network' }, ...Array(12).fill(CONFLICT), GEN_OK] })

    const p = realApi.generateImages(GEN_REQ)
    await vi.advanceTimersByTimeAsync(13 * 5000)

    await expect(p).resolves.toEqual(GENERATED)
    expect(calls).toHaveLength(14)
    expect(new Set(keysOf(calls)).size).toBe(1)
  })

  it('409 一直持續到期限（第一次送出後 120 秒）才放棄', async () => {
    const calls = stubRoutes({ '/generate': CONFLICT })

    const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'IDEMPOTENCY_IN_PROGRESS' })
    await vi.advanceTimersByTimeAsync(125_000)
    await assertion

    const n = calls.length
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(n)
  })

  it('閘道吐的 HTML 5xx（524，沒有 requestId）＝不確定有沒有送到：同一把 key 與 body 重送', async () => {
    // 後端可能還在跑、會扣點；不重送的話使用者再按一次就是新 key，重複扣點
    const calls = stubRoutes({ '/generate': [{ status: 524, data: '<html>timeout</html>' }, GEN_OK] })

    const p = realApi.generateImages(GEN_REQ)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(p).resolves.toEqual(GENERATED)
    expect(calls).toHaveLength(2)
    expect(new Set(keysOf(calls)).size).toBe(1)
    expect(calls[1].raw).toBe(calls[0].raw)
  })

  it('後端自己回的 5xx（帶 requestId）是確定的失敗，不重送', async () => {
    const calls = stubRoutes({
      '/generate': {
        status: 502,
        data: { code: 'UPSTREAM_ERROR', message: '上游失敗', fieldErrors: null, requestId: 'req_1' },
      },
    })

    const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' })
    await vi.advanceTimersByTimeAsync(20_000)
    await assertion

    expect(calls).toHaveLength(1)
  })

  it('第一發逾時（100 秒）後 409 的期限從逾時那一刻重算，後端跑到 130 秒仍拿得到回放', async () => {
    // 期限若仍從第一次送出算（120 秒），第 120 秒的 409 就會放棄，使用者再按一次就重複扣點
    const calls = stubRoutes({
      '/generate': [{ delay: 100_000, error: 'timeout' }, ...Array(6).fill(CONFLICT), GEN_OK],
    })

    const p = realApi.generateImages(GEN_REQ)
    await vi.advanceTimersByTimeAsync(100_000 + 7 * 5000)

    await expect(p).resolves.toEqual(GENERATED)
    expect(calls).toHaveLength(8)
    expect(new Set(keysOf(calls)).size).toBe(1)
  })

  it('兩次呼叫（＝兩次點擊）用不同的 key', async () => {
    const calls = stubRoutes({ '/generate': GEN_OK })

    await realApi.generateImages(GEN_REQ)
    await realApi.generateImages(GEN_REQ)

    const [a, b] = keysOf(calls)
    expect(a).toMatch(/^[0-9a-f-]{36}$/)
    expect(b).toMatch(/^[0-9a-f-]{36}$/)
    expect(a).not.toBe(b)
  })

  const backendError = (status: number, code: string) => ({
    status,
    data: { code, message: code, fieldErrors: null, requestId: 'req_1' },
  })
  it.each<{ name: string; first: Reply; reuse: boolean }>([
    { name: '逾時用完重送次數', first: { error: 'timeout' }, reuse: true },
    { name: '未知的 500（INTERNAL_ERROR）', first: backendError(500, 'INTERNAL_ERROR'), reuse: true },
    { name: '4xx（402 飼料不足）', first: backendError(402, 'INSUFFICIENT_FEEDS'), reuse: false },
    { name: '已釋放預留的 5xx（502 UPSTREAM_ERROR）', first: backendError(502, 'UPSTREAM_ERROR'), reuse: false },
    { name: '成功', first: GEN_OK, reuse: false },
  ])('$name 之後同一份輸入再按一次：沿用 key＝$reuse', async ({ name, first, reuse }) => {
    // 前一發結果不確定時換新 key，後端若已扣點就會再扣一次
    const req = { ...GEN_REQ, prompt: `沿用：${name}` }
    // 逾時會自動重送到 3 次才丟錯，其他錯誤第一次就丟
    const calls = stubRoutes({ '/generate': [...Array(first.error ? 3 : 1).fill(first), GEN_OK] })

    const p = realApi.generateImages(req).catch(() => undefined)
    await vi.advanceTimersByTimeAsync(2 * 5000)
    await p
    await realApi.generateImages(req)

    const keys = keysOf(calls)
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/)
    expect(keys.at(-1) === keys[0]).toBe(reuse)
  })

  it('輸入不同就是新的操作：前一發結果不確定也不沿用它的 key', async () => {
    const req = { ...GEN_REQ, prompt: '輸入 A' }
    const calls = stubRoutes({ '/generate': [backendError(500, 'INTERNAL_ERROR'), GEN_OK] })

    await realApi.generateImages(req).catch(() => undefined)
    await realApi.generateImages({ ...req, prompt: '輸入 B' })

    const [a, b] = keysOf(calls)
    expect(a).not.toBe(b)
  })

  it('402 不重送，把錯誤往上丟', async () => {
    const calls = stubRoutes({
      '/generate': {
        status: 402,
        data: { code: 'INSUFFICIENT_FEEDS', message: '飼料不足', fieldErrors: null, requestId: 'r' },
      },
    })

    const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'INSUFFICIENT_FEEDS' })
    await vi.advanceTimersByTimeAsync(20_000)
    await assertion

    expect(calls).toHaveLength(1)
  })

  it('連續逾時 3 次就放棄，丟 TIMEOUT', async () => {
    const calls = stubRoutes({ '/generate': { error: 'timeout' } })

    const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(2 * 5000)
    await assertion

    expect(calls).toHaveLength(3)
    expect(new Set(keysOf(calls)).size).toBe(1)
  })

  // ── 202 之後 key 留到輪詢定案（F4）──
  const NOT_FOUND = { status: 404, data: { code: 'NOT_FOUND', message: '找不到這筆生成', requestId: 'req_404' } }

  it('202 後輪詢沒定案就斷掉（404）：同輸入再送沿用同一把 key，不會拿新 key 再扣一次', async () => {
    const calls = stubRoutes({ '/generate': PENDING, '/generations/gen_1': [NOT_FOUND, DONE] })

    const first = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ status: 404 })
    await vi.advanceTimersByTimeAsync(5000)
    await first

    const second = realApi.generateImages(GEN_REQ) // 後端回放同一個 202，接回去輪詢
    await vi.advanceTimersByTimeAsync(5000)
    await expect(second).resolves.toEqual(GENERATED)

    const keys = keysOf(calls.filter((c) => c.url === '/generate'))
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBeTruthy()
    expect(keys[1]).toBe(keys[0])
  })

  it('202 後輪詢超過上限仍 processing：同輸入再送沿用同一把 key', async () => {
    const calls = stubRoutes({ '/generate': PENDING, '/generations/gen_1': PROCESSING })

    const first = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'GENERATION_STILL_PROCESSING' })
    await vi.advanceTimersByTimeAsync(12 * 60_000)
    await first

    const second = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({
      code: 'GENERATION_STILL_PROCESSING',
    })
    await vi.advanceTimersByTimeAsync(12 * 60_000)
    await second

    const keys = keysOf(calls.filter((c) => c.url === '/generate'))
    expect(keys[1]).toBe(keys[0])
  })

  it.each([
    ['done', DONE],
    ['failed', FAILED],
  ])('202 後輪詢到 %s 是定案：同輸入再送是新的 key', async (_status, final) => {
    const calls = stubRoutes({ '/generate': PENDING, '/generations/gen_1': final })

    for (let i = 0; i < 2; i++) {
      const p = realApi.generateImages(GEN_REQ).catch(() => undefined)
      await vi.advanceTimersByTimeAsync(5000)
      await p
    }

    const keys = keysOf(calls.filter((c) => c.url === '/generate'))
    expect(keys).toHaveLength(2)
    expect(keys[1]).not.toBe(keys[0])
  })

  // ── 付費流程綁登入身分（F3）──
  it('重送前登入身分變了（登出後換帳號）：中止並丟 SESSION_CHANGED，不用新帳號的憑證重送', async () => {
    setAuth({ token: 'token_a', botId: 'bot_a' })
    const calls = stubRoutes({ '/generate': [{ error: 'timeout' }, GEN_OK] })

    const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    await vi.advanceTimersByTimeAsync(1000) // 第一發逾時，正在等 5 秒後重送
    clearAuth()
    setAuth({ token: 'token_b', botId: 'bot_b' })
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion

    expect(calls).toHaveLength(1)
    expect(calls[0].headers?.Authorization).toBe('Bearer token_a')
  })

  it('202 輪詢中登入身分變了：停止輪詢並丟 SESSION_CHANGED，不拿新帳號的憑證問上一個人的生成', async () => {
    setAuth({ token: 'token_a', botId: 'bot_a' })
    const calls = stubRoutes({ '/generate': PENDING, '/generations/gen_1': PROCESSING })

    const assertion = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    await vi.advanceTimersByTimeAsync(5000)
    expect(calls.map((c) => c.url)).toEqual(['/generate', '/generations/gen_1'])
    setAuth({ token: 'token_b', botId: 'bot_b' })
    await vi.advanceTimersByTimeAsync(60_000)
    await assertion

    expect(calls).toHaveLength(2)
  })

  // ── 送出後換帳號，上一個帳號的回應晚到（codex R2）──
  /** 帳號 A 送出後登出，帳號 B 登入（discard 的順序：清 key → 換憑證） */
  function switchToB() {
    resetPaidRequests()
    clearAuth()
    setAuth({ token: 'token_b', botId: 'bot_b' })
  }
  const byB = (calls: Recorded[]) => calls.filter((c) => c.headers?.Authorization === 'Bearer token_b')

  it('A 晚到的 200 不刪 B 的 key：B 同輸入結果不確定後再按，仍沿用 B 原本那把', async () => {
    setAuth({ token: 'token_a', botId: 'bot_a' })
    const calls = stubRoutes({ '/generate': [{ ...GEN_OK, delay: 10_000 }, { error: 'timeout' }] })

    const a = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    await vi.advanceTimersByTimeAsync(1000)
    switchToB()
    // B 同輸入送出：t=1、6、11 秒三發都逾時（key 留著）；A 的 200 在 t=10 秒回來
    const b1 = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(20_000)
    await a
    await b1
    const b2 = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(20_000)
    await b2

    const keys = keysOf(byB(calls))
    expect(keys).toHaveLength(6)
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).not.toBe(keysOf(calls)[0]) // 不是 A 的那把
  })

  it('A 晚到的 202 不用 B 的憑證輪詢 A 的 generationId', async () => {
    setAuth({ token: 'token_a', botId: 'bot_a' })
    const calls = stubRoutes({ '/generate': { ...PENDING, delay: 10_000 }, '/generations/gen_1': DONE })

    const a = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    await vi.advanceTimersByTimeAsync(1000)
    switchToB()
    await vi.advanceTimersByTimeAsync(60_000)
    await a

    expect(calls.map((c) => c.url)).toEqual(['/generate'])
  })

  it.each([
    ['done', DONE],
    ['failed', FAILED],
  ])('A 輪詢晚到的 %s 不刪 B 的 key', async (_status, final) => {
    setAuth({ token: 'token_a', botId: 'bot_a' })
    const calls = stubRoutes({
      '/generate': [PENDING, { error: 'timeout' }],
      '/generations/gen_1': { ...final, delay: 10_000 },
    })

    const a = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    await vi.advanceTimersByTimeAsync(6000) // A 的輪詢 GET 已送出（t=5 秒），t=15 秒才回
    switchToB()
    const b1 = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(20_000)
    await a
    await b1
    const b2 = expect(realApi.generateImages(GEN_REQ)).rejects.toMatchObject({ code: 'TIMEOUT' })
    await vi.advanceTimersByTimeAsync(20_000)
    await b2

    expect(new Set(keysOf(byB(calls))).size).toBe(1)
  })

  it('resetPaidRequests（登出）清掉沒定案的 key：同輸入再送是新的 key', async () => {
    const calls = stubRoutes({ '/generate': { error: 'timeout' } })
    for (let i = 0; i < 2; i++) {
      const p = realApi.generateImages(GEN_REQ).catch(() => undefined)
      await vi.advanceTimersByTimeAsync(20_000)
      await p
      if (i === 0) resetPaidRequests()
    }
    const keys = [...new Set(keysOf(calls))]
    expect(keys).toHaveLength(2)
  })

  it('重新生成帶 regenOf', async () => {
    const calls = stubRoutes({ '/generate': GEN_OK })

    await realApi.generateImages({ ...GEN_REQ, count: 1, regenOf: 'res_1' })

    expect(calls[0].body).toMatchObject({ regenOf: 'res_1', count: 1 })
  })
})

const POST_REQ: GeneratePostReq = {
  outputType: 'both',
  useBrand: true,
  imageId: 'img_1',
  posterText: '春季新品',
  ratio: '1:1',
  inspirationId: 'insp_1',
  productDesc: '純棉透氣',
}
const IMG_OK = { data: { generationId: 'gen_img', results: [WIRE_RESULT], durationMs: 1, costFeeds: 5, balance: 1 } }
const TEXT_OK = {
  data: { generationId: 'gen_txt', caption: '春天新品', hashtags: ['#新品'], durationMs: 1, costFeeds: 0, balance: 1 },
}
const POSTER = { id: 'res_1', generationId: 'gen_img', url: WIRE_RESULT.tempUrl, adopted: false }
const BLOCKED = {
  status: 400,
  data: {
    code: 'CONTENT_BLOCKED',
    message: '這段描述被內容政策擋下了，請修改後再試',
    fieldErrors: null,
    requestId: 'r',
  },
}

describe('generatePost（行銷）', () => {
  it.each([
    { type: 'both', urls: ['/marketing/image', '/marketing/text'] },
    { type: 'textOnly', urls: ['/marketing/text'] },
    { type: 'imageOnly', urls: ['/marketing/image'] },
  ] as const)('outputType=$type 只打對應的端點', async ({ type, urls }) => {
    const calls = stubRoutes({ '/marketing/image': IMG_OK, '/marketing/text': TEXT_OK })

    await realApi.generatePost({ ...POST_REQ, outputType: type })

    expect(calls.map((c) => c.url).sort()).toEqual(urls)
  })

  it('image 與 text 的 body 各自只帶自己的欄位', async () => {
    const calls = stubRoutes({ '/marketing/image': IMG_OK, '/marketing/text': TEXT_OK })

    const post = await realApi.generatePost(POST_REQ)

    const image = calls.find((c) => c.url === '/marketing/image')
    const text = calls.find((c) => c.url === '/marketing/text')
    expect(image?.body).toEqual({
      imageId: 'img_1',
      posterText: '春季新品',
      ratio: '1:1',
      inspirationId: 'insp_1',
      useBrand: true,
    })
    expect(text?.body).toEqual({ productDesc: '純棉透氣', useBrand: true })
    expect(image?.timeout).toBe(100000)
    expect(text?.timeout).toBe(100000)
    const [a, b] = keysOf([image, text].filter((c) => c !== undefined))
    expect(a).toMatch(/^[0-9a-f-]{36}$/)
    expect(b).toMatch(/^[0-9a-f-]{36}$/)
    expect(a).not.toBe(b)
    expect(post).toEqual({ poster: POSTER, copy: '春天新品', hashtags: ['#新品'] })
  })

  it('配圖 202 → 輪詢 marketingImage 取 results[0]；文案 202 → 輪詢 marketingText 取 caption／hashtags', async () => {
    // 形狀照後端依 type 拔鍵後的樣子：配圖沒有 caption 鍵、文案沒有 results 鍵
    stubRoutes({
      '/marketing/image': { status: 202, data: { generationId: 'gen_img', status: 'processing', pollAfterMs: 5000 } },
      '/marketing/text': { status: 202, data: { generationId: 'gen_txt', status: 'processing', pollAfterMs: 5000 } },
      '/generations/gen_img': {
        data: {
          generationId: 'gen_img',
          type: 'marketingImage',
          status: 'done',
          results: [WIRE_RESULT],
          durationMs: 1,
          costFeeds: 5,
          balance: 1,
        },
      },
      '/generations/gen_txt': {
        data: {
          generationId: 'gen_txt',
          type: 'marketingText',
          status: 'done',
          caption: '春天新品',
          hashtags: ['#新品'],
          durationMs: 1,
          costFeeds: 0,
          balance: 1,
        },
      },
    })

    const p = realApi.generatePost(POST_REQ)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(p).resolves.toEqual({ poster: POSTER, copy: '春天新品', hashtags: ['#新品'] })
  })

  it('只成功一半：回傳成功那一半＋partialError；兩半都失敗才 throw', async () => {
    stubRoutes({ '/marketing/image': BLOCKED, '/marketing/text': TEXT_OK })
    const half = await realApi.generatePost(POST_REQ)
    expect(half.poster).toBeUndefined()
    expect(half.copy).toBe('春天新品')
    expect(half.partialError).toMatchObject({ code: 'CONTENT_BLOCKED' })

    stubRoutes({ '/marketing/image': BLOCKED, '/marketing/text': BLOCKED })
    await expect(realApi.generatePost(POST_REQ)).rejects.toMatchObject({ code: 'CONTENT_BLOCKED' })
  })
})

describe('生成結果：存入圖庫／下載事件／靈感', () => {
  it('saveGenerated 帶 generationId/resultId 打 /generations/{id}/save，回傳翻成 Asset', async () => {
    const calls = stubRoutes({
      '/generations/gen_1/save': { status: 201, data: { ...WIRE_IMAGE, source: 'aiGenerate' } },
    })

    const asset = await realApi.saveGenerated('圖生圖_x', { generationId: 'gen_1', id: 'res_1' })

    expect(calls[0].body).toEqual({ resultId: 'res_1', imageName: '圖生圖_x' })
    expect(calls[0].headers?.['Idempotency-Key']).toBeUndefined()
    expect(asset).toMatchObject({ id: 'img_1', name: '春季主視覺_01', source: 'aiGenerate', url: WIRE_IMAGE.url })
  })

  it('saveGenerated 對試穿結果也走同一支 /generations/{id}/save（來源由後端標 tryon）', async () => {
    const calls = stubRoutes({
      '/generations/gen_t/save': { status: 201, data: { ...WIRE_IMAGE, source: 'tryon' } },
    })

    const asset = await realApi.saveGenerated('試穿圖_1', { generationId: 'gen_t', id: 'res_t' })

    expect(calls[0].url).toBe('/generations/gen_t/save')
    expect(calls[0].body).toEqual({ resultId: 'res_t', imageName: '試穿圖_1' })
    expect(asset.source).toBe('tryon')
  })

  it('saveGenerated 存修圖結果：打該次生成的 /save、帶 resultId 與所選資料夾（來源由後端標 edit）', async () => {
    const calls = stubRoutes({
      '/generations/gen_e/save': { status: 201, data: { ...WIRE_IMAGE, source: 'edit', folderId: 'folder_1' } },
    })

    const asset = await realApi.saveGenerated('春季主視覺_修圖', { generationId: 'gen_e', id: 'res_e' }, 'folder_1')

    expect(calls[0].url).toBe('/generations/gen_e/save')
    expect(calls[0].body).toStrictEqual({ resultId: 'res_e', imageName: '春季主視覺_修圖', folderId: 'folder_1' })
    expect(asset.source).toBe('edit')
  })

  it('recordAdoption 只送 downloaded 與 resultId', async () => {
    const calls = stubRoutes({ '/generations/gen_1/events': { data: { recorded: true } } })

    await realApi.recordAdoption({ generationId: 'gen_1', id: 'res_1' })

    expect(calls[0].method).toBe('post')
    expect(calls[0].body).toEqual({ event: 'downloaded', resultId: 'res_1' })
    expect(calls[0].headers?.['Idempotency-Key']).toBeUndefined()
  })

  it('listInspirations 翻成 {id,name,url}', async () => {
    stubRoutes({
      '/inspirations': {
        data: {
          items: [
            {
              inspirationId: 'insp_1',
              inspirationName: '極簡白底',
              url: 'https://cdn.example.com/insp_1.png',
              promptTemplate: '白底…',
            },
          ],
        },
      },
    })

    const items = await realApi.listInspirations()

    expect(items).toEqual([{ id: 'insp_1', name: '極簡白底', url: 'https://cdn.example.com/insp_1.png' }])
  })
})

describe('POST /edit（AI 修圖）', () => {
  // costFeeds 刻意不用 8（mock 的 imageEdit 單價）：寫死 8 的實作也會過，驗不到「扣點數取後端回的值」
  const EDIT_OK = { data: { ...GEN_OK.data, costFeeds: 9 } }
  const EDIT_PROCESSING = { data: { ...PROCESSING.data, type: 'edit', costFeeds: 11 } }
  const EDIT_DONE = { data: { ...EDIT_PROCESSING.data, status: 'done', results: [WIRE_RESULT] } }
  const formOf = (c: Recorded) => c.body as FormData

  it('快速修飾：multipart 帶 imageId、options 逐個 append 成後端允許值，不帶 prompt／mask；Idempotency-Key＋100 秒逾時', async () => {
    const calls = stubRoutes({ '/edit': EDIT_OK })

    const res = await realApi.retouchImage({
      imageId: 'img_q',
      method: 'quick',
      options: ['removeObjects', 'repair', 'lighting', 'upscale'],
      instruction: undefined,
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('post')
    const form = formOf(calls[0])
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('imageId')).toBe('img_q')
    expect(form.getAll('options')).toEqual(['removeObject', 'fixFlaw', 'lightFix', 'upscale2x'])
    expect(form.has('prompt')).toBe(false)
    expect(form.has('mask')).toBe(false)
    expect(calls[0].headers?.['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[0].timeout).toBe(100000)
    expect(res).toEqual({
      ...GENERATED[0],
      method: 'quick',
      options: ['removeObjects', 'repair', 'lighting', 'upscale'],
      cost: 9,
    })
  })

  it('指令修圖：只帶 trim 過的 prompt，沒有 options', async () => {
    const calls = stubRoutes({ '/edit': EDIT_OK })

    await realApi.retouchImage({ imageId: 'img_c', method: 'command', options: [], instruction: '  把背景換成純白 ' })

    const form = formOf(calls[0])
    expect(form.get('imageId')).toBe('img_c')
    expect(form.get('prompt')).toBe('把背景換成純白')
    expect(form.getAll('options')).toEqual([])
  })

  it('202 → 輪詢 GET /generations/{id} 到 done 才回，不會再送 /edit；扣點數取輪詢回來的 costFeeds', async () => {
    const calls = stubRoutes({ '/edit': PENDING, '/generations/gen_1': [EDIT_PROCESSING, EDIT_DONE] })

    const p = realApi.retouchImage({ imageId: 'img_p', method: 'quick', options: ['repair'] })
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)
    const res = await p

    expect(calls.filter((c) => c.url === '/edit')).toHaveLength(1)
    expect(calls.filter((c) => c.url === '/generations/gen_1')).toHaveLength(2)
    expect(res).toMatchObject({ ...GENERATED[0], cost: 11 })
  })

  it('冪等鍵認的是修圖內容而不是 FormData：結果不確定後同一張圖同條件沿用 key，換一張圖是新 key', async () => {
    const calls = stubRoutes({ '/edit': [{ error: 'timeout' }, { error: 'timeout' }, { error: 'timeout' }, EDIT_OK] })
    const req = { imageId: 'img_k1', method: 'quick' as const, options: ['repair' as const] }

    const p = realApi.retouchImage(req).catch(() => undefined)
    await vi.advanceTimersByTimeAsync(2 * 5000)
    await p
    await realApi.retouchImage({ ...req, imageId: 'img_k2' })
    await realApi.retouchImage(req)

    const keys = keysOf(calls)
    expect(keys).toHaveLength(5)
    expect(keys[3]).not.toBe(keys[0]) // 換一張圖：新的操作
    expect(keys[4]).toBe(keys[0]) // 同一份輸入再按一次：後端若已扣點會回放，不會再扣
  })

  it('results[] 是空的：丟 UNEXPECTED_RESPONSE', async () => {
    stubRoutes({ '/edit': { data: { ...EDIT_OK.data, results: [] } } })

    const err = await realApi
      .retouchImage({ imageId: 'img_e', method: 'quick', options: ['repair'] })
      .catch((e: unknown) => e)

    expect(hasErrorCode(err, CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE)).toBe(true)
  })
})

describe('POST /tryon 與肖像同意', () => {
  const TRYON_REQ: TryOnReq = { modelSource: 'upload', modelRefId: 'img_m', clothImageId: 'img_c' }

  it('200：打 /tryon、body 就是契約的三個欄位、帶 Idempotency-Key 與 100 秒逾時，results[0] 翻成 GeneratedImage', async () => {
    const calls = stubRoutes({ '/tryon': GEN_OK })

    const res = await realApi.tryOn(TRYON_REQ)

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/tryon')
    expect(calls[0].method).toBe('post')
    expect(calls[0].body).toStrictEqual({ modelSource: 'upload', modelRefId: 'img_m', clothImageId: 'img_c' })
    expect(calls[0].headers?.['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[0].timeout).toBe(100000)
    expect(res).toEqual(GENERATED[0])
  })

  it('200 但 results[] 是空的：丟 UNEXPECTED_RESPONSE，不讓畫面拿到 undefined 當成功', async () => {
    stubRoutes({ '/tryon': { data: { ...GEN_OK.data, results: [] } } })

    const err = await realApi.tryOn(TRYON_REQ).catch((e: unknown) => e)

    expect(hasErrorCode(err, CLIENT_ERROR_CODES.UNEXPECTED_RESPONSE)).toBe(true)
  })

  it('202 → 輪詢 GET /generations/{id} 到 done 才回，不會再送 /tryon', async () => {
    const calls = stubRoutes({ '/tryon': PENDING, '/generations/gen_1': [PROCESSING, DONE] })

    const p = realApi.tryOn({ ...TRYON_REQ, modelSource: 'material' })
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)
    const res = await p

    expect(calls.filter((c) => c.url === '/tryon')).toHaveLength(1)
    expect(calls.filter((c) => c.url === '/generations/gen_1')).toHaveLength(2)
    expect(res).toEqual(GENERATED[0])
  })

  it('403 CONSENT_REQUIRED（上傳來源且未同意）不重送，碼原樣往上丟給試穿頁開同意視窗', async () => {
    const calls = stubRoutes({
      '/tryon': {
        status: 403,
        data: { code: 'CONSENT_REQUIRED', message: '請先同意肖像使用條款', fieldErrors: null, requestId: 'r' },
      },
    })

    const err = await realApi.tryOn(TRYON_REQ).catch((e: unknown) => e)

    expect(API_ERROR_CODES.CONSENT_REQUIRED).toBe('CONSENT_REQUIRED')
    expect(hasErrorCode(err, API_ERROR_CODES.CONSENT_REQUIRED)).toBe(true)
    expect(calls).toHaveLength(1)
  })

  it('getConsent 打 GET /users/me/consent，把 portraitConsent 翻成 { consented }', async () => {
    const calls = stubRoutes({ '/users/me/consent': { data: { portraitConsent: true } } })

    const res = await realApi.getConsent()

    expect(calls[0].method).toBe('get')
    expect(res).toEqual({ consented: true })
  })

  it('giveConsent 打 PUT /users/me/consent，body 只有 { consent: true }', async () => {
    const calls = stubRoutes({
      '/users/me/consent': { data: { portraitConsent: true, updatedAt: '2026-01-01T00:00:00Z' } },
    })

    await realApi.giveConsent()

    expect(calls[0].method).toBe('put')
    expect(calls[0].body).toEqual({ consent: true })
    expect(calls[0].headers?.['Idempotency-Key']).toBeUndefined()
  })
})

// 契約以後端程式碼為準：app/schemas/video.py、app/routers/video.py（#21～#23）
describe('圖生影（POST /video、GET /video/{taskId}、GET /video）', () => {
  const VIDEO_REQ: VideoJobReq = {
    sourceImageId: '11111111-1111-4111-8111-111111111111',
    modelKey: 'videoPro',
    template: 'cameraPan',
    ratio: '9:16',
    taskName: '圖生影_鏡頭推移',
  }
  const TASK_ID = '22222222-2222-4222-8222-222222222222'
  const ACCEPTED = { status: 202, data: { taskId: TASK_ID, status: 'pending', costFeeds: 180, balance: 820 } }

  it('createVideoJob：POST /video、body 恰為契約五個欄位、帶 Idempotency-Key 與 100 秒逾時；202 翻成 VideoJob', async () => {
    const calls = stubRoutes({ '/video': ACCEPTED })

    const job = await realApi.createVideoJob(VIDEO_REQ)

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('post')
    expect(calls[0].body).toStrictEqual(VIDEO_REQ)
    expect(calls[0].headers?.['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[0].timeout).toBe(100000)
    // 202 就是完整答案：不會去輪詢 /generations/{id}
    expect(job).toEqual({ id: TASK_ID, status: 'pending', progress: 0, cost: 180 })
  })

  it('402 飼料不足不重送，碼原樣往上丟', async () => {
    const calls = stubRoutes({
      '/video': {
        status: 402,
        data: { code: 'INSUFFICIENT_FEEDS', message: '飼料不足', fieldErrors: null, requestId: 'r' },
      },
    })

    const assertion = expect(realApi.createVideoJob(VIDEO_REQ)).rejects.toMatchObject({
      code: 'INSUFFICIENT_FEEDS',
      status: 402,
    })
    await vi.advanceTimersByTimeAsync(20_000)
    await assertion
    expect(calls).toHaveLength(1)
  })

  it('逾時後重送沿用同一把 key 與同一份 body（後端 24 小時內回放同一個 taskId，不會再預留一次）', async () => {
    const calls = stubRoutes({ '/video': [{ error: 'timeout' }, ACCEPTED] })

    const p = realApi.createVideoJob(VIDEO_REQ)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(p).resolves.toMatchObject({ id: TASK_ID })
    expect(calls).toHaveLength(2)
    expect(calls[1].headers?.['Idempotency-Key']).toBe(calls[0].headers?.['Idempotency-Key'])
    expect(calls[1].raw).toBe(calls[0].raw)
  })

  it('getVideoJob：GET /video/{taskId}，failReason→error、costFeeds→cost，null 欄位變 undefined', async () => {
    const calls = stubRoutes({
      [`/video/${TASK_ID}`]: {
        data: {
          taskId: TASK_ID,
          taskName: '圖生影_鏡頭推移',
          status: 'failed',
          progress: 0,
          etaSeconds: null,
          step: '失敗',
          resultUrl: null,
          failReason: 'upstreamError',
          costFeeds: 0,
          durationMs: 61000,
        },
      },
    })

    const job = await realApi.getVideoJob(TASK_ID)

    expect(calls[0].method).toBe('get')
    expect(job).toEqual({
      id: TASK_ID,
      name: '圖生影_鏡頭推移',
      status: 'failed',
      progress: 0,
      cost: 0,
      etaSeconds: undefined,
      resultUrl: undefined,
      error: 'upstreamError',
      durationMs: 61000,
    })
  })

  it('getVideoJob：done 帶 resultUrl 與實扣額；processing 帶 etaSeconds', async () => {
    stubRoutes({
      [`/video/${TASK_ID}`]: [
        {
          data: { taskId: TASK_ID, taskName: 'x', status: 'processing', progress: 40, etaSeconds: 60, costFeeds: 180 },
        },
        {
          data: {
            taskId: TASK_ID,
            taskName: 'x',
            status: 'done',
            progress: 100,
            resultUrl: 'https://r2.example/v.mp4',
            costFeeds: 180,
            durationMs: 90000,
          },
        },
      ],
    })

    expect(await realApi.getVideoJob(TASK_ID)).toMatchObject({ status: 'processing', progress: 40, etaSeconds: 60 })
    expect(await realApi.getVideoJob(TASK_ID)).toMatchObject({
      status: 'done',
      progress: 100,
      cost: 180,
      resultUrl: 'https://r2.example/v.mp4',
      durationMs: 90000,
    })
  })

  it('listVideoJobs：GET /video?limit=10，items 逐筆翻成 VideoJob（unread 不讀）', async () => {
    const calls = stubRoutes({
      '/video': {
        data: {
          unread: 0,
          items: [
            { taskId: 't2', taskName: '還原測試', status: 'processing', progress: 50, etaSeconds: 30, costFeeds: 45 },
            { taskId: 't1', taskName: '舊的', status: 'done', progress: 100, resultUrl: 'u', costFeeds: 45 },
          ],
        },
      },
    })

    const jobs = await realApi.listVideoJobs()

    expect(calls[0].method).toBe('get')
    expect(calls[0].params).toEqual({ limit: 10 })
    expect(jobs.map((j) => [j.id, j.name, j.status, j.progress, j.cost])).toEqual([
      ['t2', '還原測試', 'processing', 50, 45],
      ['t1', '舊的', 'done', 100, 45],
    ])
  })
})
