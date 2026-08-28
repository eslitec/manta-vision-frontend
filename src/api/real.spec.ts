import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'
import { http } from './http'
import { realApi } from './real'

// 跟 http.spec.ts 一樣用假 adapter 取代網路，但這裡關心的是**上一層**：
// 送出去的 URL 與 body 對不對、後端的回應有沒有被正確翻成 Session。

interface Recorded {
  url: string
  body: unknown
  method?: string
  params?: unknown
}

/** 依 URL 回傳對應的假回應；同時記下每一次請求，供斷言檢查。 */
function stubRoutes(routes: Record<string, { status?: number; data: unknown }>) {
  const calls: Recorded[] = []

  const adapter: AxiosAdapter = async (config: AxiosRequestConfig) => {
    const url = config.url ?? ''
    calls.push({
      url,
      method: config.method,
      params: config.params,
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    })

    const route = routes[url]
    if (!route) throw new Error(`測試沒有為 ${url} 準備回應`)

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
    // 展開——有人把它拿掉的話，整站會在執行期才炸「api.listModels is not a
    // function」，而不是在這裡。
    expect(typeof realApi.listModels).toBe('function')
    expect(typeof realApi.getFeed).toBe('function')
    // 圖庫「編輯產物」與生成結果存檔目前後端沒有對應端點，仍然吃假資料
    expect(typeof realApi.editImage).toBe('function')
    expect(typeof realApi.saveGenerated).toBe('function')
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
    })
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
