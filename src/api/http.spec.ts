import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, AxiosResponse } from 'axios'
import { clearAuth, ctx, http, setAuth, setSessionExpiredHandler } from './http'
import { ApiError, fieldErrorsOf, hasErrorCode, isSessionInvalid } from './errors'

// 用假的 adapter 取代真正的網路：測的是攔截器鏈（帶 header、翻錯誤、通知應用層），
// 不是 axios 本身會不會送出 HTTP。
function stubAdapter(reply: { status: number; data: unknown } | 'network' | 'timeout') {
  const seen: { headers?: Record<string, unknown> } = {}

  const adapter: AxiosAdapter = async (config) => {
    seen.headers = JSON.parse(JSON.stringify(config.headers ?? {}))

    if (reply === 'network' || reply === 'timeout') {
      const error = new Error(reply) as Error & { isAxiosError: boolean; code?: string }
      error.isAxiosError = true
      if (reply === 'timeout') error.code = 'ECONNABORTED'
      throw error
    }

    const response = {
      status: reply.status,
      statusText: '',
      data: reply.data,
      headers: {},
      config,
    } as AxiosResponse

    if (reply.status >= 400) {
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
  return seen
}

afterEach(() => {
  clearAuth()
  setSessionExpiredHandler(null)
  http.defaults.adapter = undefined
})

describe('兩把鑰匙的 header', () => {
  it('沒登入時不送 Authorization 與 X-Bot-Id', async () => {
    const seen = stubAdapter({ status: 200, data: {} })

    await http.get('/bots')

    expect(seen.headers?.Authorization).toBeUndefined()
    // 空的 X-Bot-Id 會被後端當成格式錯誤擋掉，所以「沒有」就要真的不送
    expect(seen.headers?.['X-Bot-Id']).toBeUndefined()
  })

  it('setAuth 之後兩個 header 都會帶上', async () => {
    setAuth({ token: 'jwt-abc', botId: 'bot-123' })
    const seen = stubAdapter({ status: 200, data: {} })

    await http.get('/images')

    expect(seen.headers?.Authorization).toBe('Bearer jwt-abc')
    expect(seen.headers?.['X-Bot-Id']).toBe('bot-123')
  })

  it('setAuth 可以只更新其中一把，不會清掉另一把', () => {
    setAuth({ token: 'jwt-abc', botId: 'bot-123' })
    setAuth({ botId: 'bot-456' })

    expect(ctx.token).toBe('jwt-abc')
    expect(ctx.botId).toBe('bot-456')
  })

  it('clearAuth 兩把都清掉', () => {
    setAuth({ token: 'jwt-abc', botId: 'bot-123' })
    clearAuth()

    expect(ctx.token).toBe('')
    expect(ctx.botId).toBe('')
  })
})

describe('後端統一錯誤格式的翻譯', () => {
  it('照契約的錯誤保留 code、message、fieldErrors 與 requestId', async () => {
    stubAdapter({
      status: 400,
      data: {
        code: 'VALUE_OUT_OF_RANGE',
        message: '輸入值不在允許範圍',
        fieldErrors: { password: ['密碼超過 72 bytes（中文約 24 字），請縮短'] },
        requestId: 'req_abc123',
      },
    })

    const error = await http.post('/auth/register', {}).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(hasErrorCode(error, 'VALUE_OUT_OF_RANGE')).toBe(true)
    expect(error.status).toBe(400)
    expect(error.requestId).toBe('req_abc123')
    expect(fieldErrorsOf(error, 'password')).toHaveLength(1)
    // 沒有錯誤的欄位回空陣列，樣板可以直接 v-for
    expect(fieldErrorsOf(error, 'username')).toEqual([])
  })

  it('連不到伺服器時給 NETWORK_ERROR 而不是原始 axios 錯誤', async () => {
    stubAdapter('network')

    const error = await http.get('/bots').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(hasErrorCode(error, 'NETWORK_ERROR')).toBe(true)
    expect(error.status).toBe(0)
  })

  it('逾時與連不到分開回碼', async () => {
    stubAdapter('timeout')

    const error = await http.get('/bots').catch((e) => e)

    expect(hasErrorCode(error, 'TIMEOUT')).toBe(true)
  })

  it('有回應但不是統一格式時，依狀態碼給可分流的碼', async () => {
    stubAdapter({ status: 502, data: '<html>Bad Gateway</html>' })

    const error = await http.get('/bots').catch((e) => e)

    expect(hasErrorCode(error, 'INTERNAL_ERROR')).toBe(true)
    expect(error.status).toBe(502)
  })
})

describe('token 失效的通知', () => {
  it('TOKEN_EXPIRED 會通知應用層', async () => {
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)
    stubAdapter({
      status: 401,
      data: { code: 'TOKEN_EXPIRED', message: '請先登入', fieldErrors: null, requestId: 'req_1' },
    })

    await http.get('/bots').catch(() => undefined)

    expect(onExpired).toHaveBeenCalledOnce()
    expect(isSessionInvalid(onExpired.mock.calls[0][0])).toBe(true)
  })

  it('登入打錯密碼（同樣是 401）不會通知——否則會變成無限重導', async () => {
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)
    stubAdapter({
      status: 401,
      data: {
        code: 'INVALID_CREDENTIALS',
        message: '帳號或密碼錯誤',
        fieldErrors: null,
        requestId: 'req_2',
      },
    })

    const error = await http.post('/auth/login', {}).catch((e) => e)

    expect(onExpired).not.toHaveBeenCalled()
    expect(hasErrorCode(error, 'INVALID_CREDENTIALS')).toBe(true)
  })
})
