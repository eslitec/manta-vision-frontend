import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// 把 @/api 換成受控的假實作，讓 store 在隔離狀態下測試（不依賴 mock.ts 內部 db）。
const getFeed = vi.fn()
const getBrand = vi.fn()
const saveBrand = vi.fn()
const getConsent = vi.fn()
const giveConsent = vi.fn()
const listModels = vi.fn()
const listBots = vi.fn()
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
    listBots: () => listBots(),
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
    getFeed.mockResolvedValue({ balance: 999, monthlyLimit: 5000, monthUsed: 3760, estImages: 124, estVideos: 22 })
    const feed = useFeedStore()
    expect(feed.balance).toBe(0)
    expect(feed.monthlyLimit).toBeNull()
    await feed.refresh()
    expect(feed.balance).toBe(999)
    expect(feed.monthlyLimit).toBe(5000)
    expect(feed.monthUsed).toBe(3760)
    expect(feed.estImages).toBe(124)
    expect(feed.estVideos).toBe(22)
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

  it('save 期間切換 saving 狀態並呼叫 saveBrand，並用回傳值覆蓋本地 profile', async () => {
    getBrand.mockResolvedValue({ name: '日安選物', portraitConsent: '本人同意…', imageLicense: '僅供本品牌使用。' })
    // 真後端會回存檔後的最新內容（例如 Logo 換成真正的網址）；save() 要把它寫回
    // profile，不能沿用呼叫前的本地值，否則下一次存檔會重複上傳同一張 Logo。
    saveBrand.mockResolvedValue({
      name: '日安選物（已更新）',
      portraitConsent: '本人同意…',
      imageLicense: '僅供本品牌使用。',
    })
    const brand = useBrandStore()
    await brand.load()
    await brand.save()
    expect(saveBrand).toHaveBeenCalledTimes(1)
    expect(brand.saving).toBe(false)
    expect(brand.profile?.name).toBe('日安選物（已更新）')
  })

  it('沒有 profile 時 save 不呼叫 API', async () => {
    const brand = useBrandStore()
    await brand.save()
    expect(saveBrand).not.toHaveBeenCalled()
  })

  it('並行的 load 共用同一發請求（session store 與首頁會同時呼叫）', async () => {
    getBrand.mockResolvedValue({ name: '日安選物' })
    const brand = useBrandStore()
    await Promise.all([brand.load(), brand.load()])
    expect(getBrand).toHaveBeenCalledTimes(1)
    expect(brand.profile?.name).toBe('日安選物')
  })

  it('reset 之後才回來的舊回應不寫進 profile', async () => {
    let resolveOld!: (v: unknown) => void
    getBrand.mockReturnValueOnce(new Promise((r) => (resolveOld = r)))
    const brand = useBrandStore()
    const pending = brand.load()
    brand.reset()
    resolveOld({ name: '上一個帳號' })
    await pending
    expect(brand.profile).toBeNull()
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
    listModels.mockResolvedValue([{ modelKey: 'imageStandard', name: '標準', modelType: 'image', costFeeds: 8 }])
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

  // 側欄／麵包屑／圖庫提示共用的機器人名稱：登入時各打一次 GET /bots 與 GET /brand
  describe('botName', () => {
    const ownBot = { botId: 'bot-123', botName: '我的機器人' }

    it('登入前為空字串，登入後打一次 listBots 與 getBrand，品牌設定名稱優先', async () => {
      login.mockResolvedValue(fakeSession({ botId: 'bot-123' }))
      listBots.mockResolvedValue([ownBot])
      getBrand.mockResolvedValue({ name: '春日選品' })
      const session = useSessionStore()
      expect(session.botName).toBe('')
      await session.login('mavis', 'mavis123')
      await vi.waitFor(() => expect(session.botName).toBe('春日選品'))
      expect(listBots).toHaveBeenCalledTimes(1)
      expect(getBrand).toHaveBeenCalledTimes(1)
      expect(session.bots).toEqual([ownBot])
    })

    it('品牌設定沒有名稱時退回目前 botId 的 botName', async () => {
      login.mockResolvedValue(fakeSession({ botId: 'bot-123' }))
      listBots.mockResolvedValue([{ botId: 'bot-other', botName: '別人的' }, ownBot])
      getBrand.mockResolvedValue({ name: '' })
      const session = useSessionStore()
      await session.login('mavis', 'mavis123')
      await vi.waitFor(() => expect(session.botName).toBe('我的機器人'))
    })

    it('兩支 API 都失敗時退回 i18n 預設，且 login 不 reject', async () => {
      login.mockResolvedValue(fakeSession())
      listBots.mockRejectedValue(new Error('NETWORK_ERROR'))
      getBrand.mockRejectedValue(new Error('NETWORK_ERROR'))
      const session = useSessionStore()
      await expect(session.login('mavis', 'mavis123')).resolves.toBeUndefined()
      await vi.waitFor(() => expect(session.botName).toBe('我的品牌'))
    })

    it('restore 也會取名稱', async () => {
      listBots.mockResolvedValue([{ botId: 'bot-test', botName: '我的機器人' }])
      getBrand.mockResolvedValue({ name: '' })
      localStorage.setItem('mv_session', JSON.stringify(fakeSession()))
      const session = useSessionStore()
      session.restore()
      await vi.waitFor(() => expect(session.botName).toBe('我的機器人'))
    })

    it('登出清空 bots、brand profile 與名稱，換帳號不殘留', async () => {
      login.mockResolvedValue(fakeSession({ botId: 'bot-123' }))
      logout.mockResolvedValue(undefined)
      listBots.mockResolvedValue([ownBot])
      getBrand.mockResolvedValue({ name: '春日選品' })
      const session = useSessionStore()
      const brand = useBrandStore()
      await session.login('mavis', 'mavis123')
      await vi.waitFor(() => expect(session.botName).toBe('春日選品'))
      await session.logout()
      expect(session.bots).toEqual([])
      expect(brand.profile).toBeNull()
      expect(session.botName).toBe('')
    })
  })
})
