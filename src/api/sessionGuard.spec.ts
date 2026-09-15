import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, AxiosResponse } from 'axios'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router/routes'
import { clearAuth, http, setSessionExpiredHandler } from './http'
import { installSessionGuard } from './sessionGuard'

// 這組測試走的是**完整的那一條線**：後端回 401 → http 攔截器翻成 ApiError →
// 判定是 session 失效 → 呼叫掛勾 → 清 session、導回登入頁。
//
// 端對端測不到這一段：目前只有 auth 三支端點是真的，其他頁面都還吃假資料，
// 所以瀏覽器裡根本沒有一支「帶著壞掉的 token 去打」的請求可以觸發它。
// 端點補上去之後這條線才會在真實情境跑到，在那之前由這裡守著。

function stubStatus(status: number, data: unknown) {
  const adapter: AxiosAdapter = async (config) => {
    const response = { status, statusText: '', data, headers: {}, config } as AxiosResponse
    const error = new Error('failed') as Error & {
      isAxiosError: boolean
      response: AxiosResponse
    }
    error.isAxiosError = true
    error.response = response
    throw error
  }
  http.defaults.adapter = adapter
}

function setup() {
  const router = createRouter({ history: createMemoryHistory(), routes })
  const session = { forceLogout: vi.fn() }
  const uninstall = installSessionGuard(session, router)
  return { router, session, uninstall }
}

afterEach(() => {
  clearAuth()
  setSessionExpiredHandler(null)
  http.defaults.adapter = undefined
})

describe('installSessionGuard', () => {
  it('後端說 TOKEN_INVALID 時清掉 session 並導回登入頁，帶著原本要去的位置', async () => {
    // 真的後端就是回這個碼——竄改過的 token 與登出後被列入黑名單的 token
    // 都是 TOKEN_INVALID（已用 curl 對真後端確認）。
    const { router, session } = setup()
    await router.push('/library')

    stubStatus(401, {
      code: 'TOKEN_INVALID',
      message: '請先登入',
      fieldErrors: null,
      requestId: 'req_1',
    })
    await http.get('/bots').catch(() => undefined)

    expect(session.forceLogout).toHaveBeenCalledOnce()
    // 掛勾裡的 router.push 是非同步的，而攔截器不會（也不該）等它，
    // 所以這裡要等導向真的完成再斷言。
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
    expect(router.currentRoute.value.query.redirect).toBe('/library')
  })

  it('TOKEN_EXPIRED 同樣處理', async () => {
    const { router, session } = setup()
    await router.push('/library')

    stubStatus(401, {
      code: 'TOKEN_EXPIRED',
      message: '登入已過期',
      fieldErrors: null,
      requestId: 'req_2',
    })
    await http.get('/bots').catch(() => undefined)

    expect(session.forceLogout).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
  })

  it('登入打錯密碼（同樣是 401）不動 session，也不導頁', async () => {
    // 混在一起的話，打錯一次密碼就會被導到登入頁、再打錯再導一次——
    // 使用者看到的是畫面一直閃，錯誤訊息還來不及看就被洗掉。
    const { router, session } = setup()
    await router.push('/login')

    stubStatus(401, {
      code: 'INVALID_CREDENTIALS',
      message: '帳號或密碼錯誤',
      fieldErrors: null,
      requestId: 'req_3',
    })
    await http.post('/auth/login', {}).catch(() => undefined)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(session.forceLogout).not.toHaveBeenCalled()
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('已經在登入頁時不再導一次，避免 redirect 被寫成 /login 自己', async () => {
    const { router, session } = setup()
    await router.push('/login?redirect=/library')

    stubStatus(401, {
      code: 'TOKEN_EXPIRED',
      message: '登入已過期',
      fieldErrors: null,
      requestId: 'req_4',
    })
    await http.get('/bots').catch(() => undefined)
    // 給一次事件迴圈的機會——如果掛勾真的多導了一次，這裡就會抓到
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(session.forceLogout).toHaveBeenCalledOnce()
    // 原本的 redirect 要留著，不能被蓋成 '/login'
    expect(router.currentRoute.value.query.redirect).toBe('/library')
  })

  it('後端連不到（NETWORK_ERROR）不該把人登出', async () => {
    // 後端重開、網路瞬斷都會走到這裡。把人踢出去等於「後端抖一下就要重新登入」，
    // 而且他的 token 其實好好的。
    const { router, session } = setup()
    await router.push('/library')

    const adapter: AxiosAdapter = async () => {
      const error = new Error('network') as Error & { isAxiosError: boolean }
      error.isAxiosError = true
      throw error
    }
    http.defaults.adapter = adapter
    await http.get('/bots').catch(() => undefined)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(session.forceLogout).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/library')
  })
})
