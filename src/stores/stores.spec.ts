import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// 把 @/api 換成受控的假實作，讓 store 在隔離狀態下測試（不依賴 mock.ts 內部 db）。
const getFeed = vi.fn()
const getBrand = vi.fn()
const saveBrand = vi.fn()
const getConsent = vi.fn()
const giveConsent = vi.fn()
const listModels = vi.fn()
const login = vi.fn()
const logout = vi.fn()

vi.mock('@/api', () => ({
  api: {
    getFeed: () => getFeed(),
    getBrand: () => getBrand(),
    saveBrand: (p: unknown) => saveBrand(p),
    getConsent: () => getConsent(),
    giveConsent: () => giveConsent(),
    listModels: () => listModels(),
    login: (u: string, p: string) => login(u, p),
    logout: () => logout(),
  },
}))

import { useFeedStore } from './feed'
import { useBrandStore } from './brand'
import { useConsentStore } from './consent'
import { useModelsStore } from './models'
import { useSessionStore } from './session'
import { ctx, clearAuth } from '@/api/http'
import { fakeSession } from '@/test/factories'

// environment: 'node' 沒有原生 localStorage，用記憶體 Map 塞一個最小 shim
function createLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.stubGlobal('localStorage', createLocalStorageStub())
})

describe('feed store', () => {
  it('refresh 從 API 拉餘額並標記 loaded', async () => {
    getFeed.mockResolvedValue({ balance: 999 })
    const feed = useFeedStore()
    expect(feed.balance).toBe(0)
    await feed.refresh()
    expect(feed.balance).toBe(999)
    expect(feed.loaded).toBe(true)
  })
})

describe('brand store', () => {
  it('load 載入品牌設定', async () => {
    getBrand.mockResolvedValue({ name: '日安選物' })
    const brand = useBrandStore()
    await brand.load()
    expect(brand.profile?.name).toBe('日安選物')
  })

  it('load 已有資料時不重複打 API', async () => {
    getBrand.mockResolvedValue({ name: '日安選物' })
    const brand = useBrandStore()
    await brand.load()
    await brand.load()
    expect(getBrand).toHaveBeenCalledTimes(1)
  })

  it('save 期間切換 saving 狀態並呼叫 saveBrand', async () => {
    getBrand.mockResolvedValue({ name: '日安選物' })
    saveBrand.mockResolvedValue(undefined)
    const brand = useBrandStore()
    await brand.load()
    await brand.save()
    expect(saveBrand).toHaveBeenCalledTimes(1)
    expect(brand.saving).toBe(false)
  })

  it('沒有 profile 時 save 不呼叫 API', async () => {
    const brand = useBrandStore()
    await brand.save()
    expect(saveBrand).not.toHaveBeenCalled()
  })
})

describe('consent store', () => {
  it('load 帶回同意狀態', async () => {
    getConsent.mockResolvedValue({ consented: true })
    const consent = useConsentStore()
    await consent.load()
    expect(consent.consented).toBe(true)
  })

  it('give 呼叫 API 並樂觀地把本地設為已同意', async () => {
    getConsent.mockResolvedValue({ consented: false })
    giveConsent.mockResolvedValue(undefined)
    const consent = useConsentStore()
    await consent.load()
    await consent.give()
    expect(giveConsent).toHaveBeenCalledTimes(1)
    expect(consent.consented).toBe(true)
  })
})

describe('models store', () => {
  it('load 載入模型清單', async () => {
    listModels.mockResolvedValue([{ id: 'nano-banana', name: 'Nano Banana', provider: 'g', costPerImage: 4 }])
    const models = useModelsStore()
    await models.load()
    expect(models.models).toHaveLength(1)
  })

  it('load 只打一次 API（已載入就跳過）', async () => {
    listModels.mockResolvedValue([])
    const models = useModelsStore()
    await models.load()
    await models.load()
    expect(listModels).toHaveBeenCalledTimes(1)
  })
})

describe('session store', () => {
  // session store 不只改自己的 state，還會把兩把鑰匙灌進 http 層（模組層級的
  // 單例），所以每個測試前要清掉，否則會互相污染。
  beforeEach(() => {
    clearAuth()
  })

  it('登入成功寫入 session 與 localStorage', async () => {
    const session0 = fakeSession()
    login.mockResolvedValue(session0)
    const session = useSessionStore()
    await session.login('mavis', 'mavis123')
    expect(session.session).toEqual(session0)
    expect(session.isAuthenticated).toBe(true)
    expect(localStorage.getItem('mv_session')).toBe(JSON.stringify(session0))
  })

  it('登入成功會把兩把鑰匙灌進 http 層', async () => {
    // 最容易漏的一步。漏了的話畫面看起來是登入的，但每一支 API 都不帶
    // Authorization，於是全部 401——而且要等到下一次呼叫才會發作。
    login.mockResolvedValue(fakeSession({ token: 'jwt-abc', botId: 'bot-123' }))
    const session = useSessionStore()
    await session.login('mavis', 'mavis123')
    expect(ctx.token).toBe('jwt-abc')
    expect(ctx.botId).toBe('bot-123')
  })

  it('帳密錯誤時 session 維持 null 且呼叫端會 reject', async () => {
    login.mockRejectedValue(new Error('INVALID_CREDENTIALS'))
    const session = useSessionStore()
    await expect(session.login('mavis', 'wrong')).rejects.toThrow('INVALID_CREDENTIALS')
    expect(session.session).toBeNull()
    expect(session.isAuthenticated).toBe(false)
  })

  it('restore 從預先塞好的 localStorage 值還原 session 並補上鑰匙', () => {
    const saved = fakeSession({ token: 'jwt-abc', botId: 'bot-123' })
    localStorage.setItem('mv_session', JSON.stringify(saved))
    const session = useSessionStore()
    session.restore()
    expect(session.session).toEqual(saved)
    expect(session.isAuthenticated).toBe(true)
    expect(ctx.token).toBe('jwt-abc')
  })

  it('restore 遇到過期的憑證要丟掉，不能還原', () => {
    // 憑證沒有續期機制。還原一張過期的 token 只會讓每支 API 都 401，
    // 使用者看到的是「登入著但什麼都讀不到」的壞掉畫面，比直接要他重登更糟。
    localStorage.setItem('mv_session', JSON.stringify(fakeSession({ expiresAt: Date.now() - 1 })))
    const session = useSessionStore()
    session.restore()
    expect(session.session).toBeNull()
    expect(localStorage.getItem('mv_session')).toBeNull()
    expect(ctx.token).toBe('')
  })

  it('restore 遇到壞掉的 JSON 不會炸，直接清掉', () => {
    localStorage.setItem('mv_session', '{not json')
    const session = useSessionStore()
    expect(() => session.restore()).not.toThrow()
    expect(session.session).toBeNull()
    expect(localStorage.getItem('mv_session')).toBeNull()
  })

  it('logout 清空 session、localStorage 與鑰匙', async () => {
    login.mockResolvedValue(fakeSession({ token: 'jwt-abc', botId: 'bot-123' }))
    logout.mockResolvedValue(undefined)
    const session = useSessionStore()
    await session.login('mavis', 'mavis123')
    await session.logout()
    expect(session.session).toBeNull()
    expect(localStorage.getItem('mv_session')).toBeNull()
    expect(ctx.token).toBe('')
    expect(ctx.botId).toBe('')
  })

  it('後端打不通時仍然在前端登出', async () => {
    // 不然使用者會卡在「按了登出卻還是登入中」，而且他通常正是因為
    // 後端怪怪的才想登出。
    login.mockResolvedValue(fakeSession())
    logout.mockRejectedValue(new Error('NETWORK_ERROR'))
    const session = useSessionStore()
    await session.login('mavis', 'mavis123')
    await expect(session.logout()).rejects.toThrow('NETWORK_ERROR')
    expect(session.session).toBeNull()
    expect(localStorage.getItem('mv_session')).toBeNull()
  })

  it('forceLogout 清乾淨但不打 /auth/logout', async () => {
    // token 已經失效了，再打一次只會再收到一次 401。
    login.mockResolvedValue(fakeSession())
    const session = useSessionStore()
    await session.login('mavis', 'mavis123')
    session.forceLogout()
    expect(session.session).toBeNull()
    expect(ctx.token).toBe('')
    expect(logout).not.toHaveBeenCalled()
  })
})
