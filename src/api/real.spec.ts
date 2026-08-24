import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'
import { http } from './http'
import { realApi } from './real'

// 跟 http.spec.ts 一樣用假 adapter 取代網路，但這裡關心的是**上一層**：
// 送出去的 URL 與 body 對不對、後端的回應有沒有被正確翻成 Session。

interface Recorded {
  url: string
  body: unknown
}

/** 依 URL 回傳對應的假回應；同時記下每一次請求，供斷言檢查。 */
function stubRoutes(routes: Record<string, { status?: number; data: unknown }>) {
  const calls: Recorded[] = []

  const adapter: AxiosAdapter = async (config: AxiosRequestConfig) => {
    const url = config.url ?? ''
    calls.push({
      url,
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
    // realApi 是 { ...mockApi, login, register, logout }。這個測試釘住那個
    // 展開——有人把它拿掉的話，整站會在執行期才炸「api.listModels is not a
    // function」，而不是在這裡。
    expect(typeof realApi.listModels).toBe('function')
    expect(typeof realApi.getFeed).toBe('function')
  })
})
