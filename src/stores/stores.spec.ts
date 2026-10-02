import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
const createVideoJob = vi.fn()
const getVideoJob = vi.fn()
const listVideoJobs = vi.fn()
const listFolders = vi.fn()
const resetPaidRequests = vi.fn()

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
    createVideoJob: (req: unknown) => createVideoJob(req),
    getVideoJob: (id: string) => getVideoJob(id),
    listVideoJobs: () => listVideoJobs(),
    listFolders: () => listFolders(),
  },
}))

vi.mock('@/api/real', () => ({ resetPaidRequests: () => resetPaidRequests() }))

import { useFeedStore } from './feed'
import { useBrandStore } from './brand'
import { useConsentStore } from './consent'
import { useModelsStore } from './models'
import { useSessionStore } from './session'
import { useGenerationTasksStore } from './generationTasks'
import { ctx, clearAuth } from '@/api/http'
import { ApiError } from '@/api/errors'
import { fakeSession } from '@/test/factories'
import { useAssets } from '@/composables/useAssets'

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

  it('$reset 之後才回來的舊回應不寫進 profile', async () => {
    let resolveOld!: (v: unknown) => void
    getBrand.mockReturnValueOnce(new Promise((r) => (resolveOld = r)))
    const brand = useBrandStore()
    const pending = brand.load()
    brand.$reset()
    resolveOld({ name: '上一個帳號' })
    await pending
    expect(brand.profile).toBeNull()
  })

  it('save 送出後換帳號：A 晚到的 PUT 回應不寫進 B 的 profile，也不動 B 的 saving', async () => {
    getBrand.mockResolvedValueOnce({ name: '帳號 A' }).mockResolvedValueOnce({ name: '帳號 B' })
    let resolveA!: (v: unknown) => void
    saveBrand.mockReturnValueOnce(new Promise((r) => (resolveA = r)))
    const brand = useBrandStore()
    await brand.load()
    const pendingA = brand.save()
    brand.$reset() // A 登出
    expect(brand.saving).toBe(false)
    await brand.load() // B 登入
    let resolveB!: (v: unknown) => void
    saveBrand.mockReturnValueOnce(new Promise((r) => (resolveB = r)))
    const pendingB = brand.save()

    resolveA({ name: '帳號 A（已存檔）' })
    await pendingA
    expect(brand.profile?.name).toBe('帳號 B')
    expect(brand.saving).toBe(true) // B 的存檔還在路上

    resolveB({ name: '帳號 B（已存檔）' })
    await pendingB
    expect(brand.profile?.name).toBe('帳號 B（已存檔）')
    expect(brand.saving).toBe(false)
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

  it('已同意時 give 不重打 PUT（從「查看條款」開視窗再按「我知道了」）', async () => {
    getConsent.mockResolvedValue({ consented: true })
    const consent = useConsentStore()
    await consent.load()
    await consent.give()
    expect(giveConsent).not.toHaveBeenCalled()
  })

  it('並行的 load 共用同一發請求（掛載時與搶在回應前的上傳會同時呼叫），loaded 才為 true', async () => {
    getConsent.mockResolvedValue({ consented: true })
    const consent = useConsentStore()
    expect(consent.loaded).toBe(false)
    await Promise.all([consent.load(), consent.load()])
    expect(getConsent).toHaveBeenCalledTimes(1)
    expect(consent.loaded).toBe(true)
  })

  it('$reset 之後才回來的舊回應不採用，之後重新載入', async () => {
    let resolve!: (v: { consented: boolean }) => void
    getConsent.mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const consent = useConsentStore()
    const p = consent.load()
    consent.$reset()
    resolve({ consented: true })
    await p
    expect(consent.consented).toBe(false)
    expect(consent.loaded).toBe(false)
    getConsent.mockResolvedValue({ consented: false })
    await consent.load()
    expect(getConsent).toHaveBeenCalledTimes(2)
    expect(consent.loaded).toBe(true)
  })

  it('give 送出後登出：晚到的 PUT 回應不把下一個帳號標成已同意', async () => {
    let resolve!: (v: unknown) => void
    giveConsent.mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const consent = useConsentStore()
    const pending = consent.give()
    consent.$reset()
    resolve(undefined)
    await pending
    expect(consent.consented).toBe(false)
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
  it('登出清掉肖像同意狀態：同意綁使用者，下一個帳號在同一分頁不能沿用', async () => {
    login.mockResolvedValue(fakeSession())
    logout.mockResolvedValue(undefined)
    getConsent.mockResolvedValue({ consented: true })
    const session = useSessionStore()
    const consent = useConsentStore()
    await session.login('mavis', 'mavis123')
    await consent.load()
    expect(consent.consented).toBe(true)
    await session.logout()
    expect(consent.consented).toBe(false)
    expect(consent.loaded).toBe(false)
  })

  describe('登出清掉帳號範圍的快取（餘額、資料夾）', () => {
    const FEED_A = { balance: 900, monthlyLimit: 1000, monthUsed: 100, estImages: 9, estVideos: 3 }
    const FOLDERS_A = { items: [{ folderId: 'f_a', folderName: 'A 的資料夾', imageCount: 2 }], unfiledCount: 5 }

    it('登出後餘額與資料夾歸零、loaded 旗標放掉，下一個帳號會重新取', async () => {
      getFeed.mockResolvedValue(FEED_A)
      listFolders.mockResolvedValue(FOLDERS_A)
      logout.mockResolvedValue(undefined)
      const session = useSessionStore()
      const feed = useFeedStore()
      const { folders, unfiledCount, loadFolders } = useAssets()
      await feed.refresh()
      await loadFolders()
      expect(feed.balance).toBe(900)
      expect(folders.value).toHaveLength(1)

      await session.logout()

      expect(feed).toMatchObject({ loaded: false, balance: 0, monthlyLimit: null, monthUsed: 0 })
      expect(folders.value).toEqual([])
      expect(unfiledCount.value).toBe(0)
      expect(resetPaidRequests).toHaveBeenCalledTimes(1) // 沒定案的 Idempotency-Key 一併清掉
      listFolders.mockResolvedValue({ items: [], unfiledCount: 0 })
      await loadFolders() // 不帶 force：旗標沒放掉的話這裡不會打 API
      expect(listFolders).toHaveBeenCalledTimes(2)
    })

    it('登出前發出、登出後才回來的 GET /feeds 與 GET /folders 不寫回狀態', async () => {
      let resolveFeed!: (v: unknown) => void
      let resolveFolders!: (v: unknown) => void
      getFeed.mockReturnValue(new Promise((r) => (resolveFeed = r)))
      listFolders.mockReturnValue(new Promise((r) => (resolveFolders = r)))
      const session = useSessionStore()
      const feed = useFeedStore()
      const { folders, unfiledCount, loadFolders } = useAssets()
      const pending = [feed.refresh(), loadFolders(true)]

      session.forceLogout()
      resolveFeed(FEED_A)
      resolveFolders(FOLDERS_A)
      await Promise.all(pending)

      expect(feed).toMatchObject({ loaded: false, balance: 0 })
      expect(folders.value).toEqual([])
      expect(unfiledCount.value).toBe(0)
    })
  })

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

describe('generationTasks store', () => {
  const poster = { id: 'r1', generationId: 'g1', url: '', adopted: false }
  const halves = [
    { kind: 'marketingImage' as const, name: '行銷海報圖_春季新品', cost: 5 },
    { kind: 'marketingText' as const, name: '行銷文案_純棉透氣', cost: 0 },
  ]
  const errorText = (e: unknown) => `錯：${(e as Error | undefined)?.message}`
  const byKind = (s: ReturnType<typeof useGenerationTasksStore>, kind: string) => s.tasks.find((t) => t.kind === kind)

  it('行銷「文案＋配圖」記成兩筆任務：送出時進行中，完成後各自完成且計入未讀', async () => {
    const s = useGenerationTasksStore()
    let resolve!: (p: { poster: typeof poster; copy: string; hashtags: string[] }) => void
    const p = s.createMarketingTask(() => new Promise((r) => (resolve = r)), halves, errorText)
    expect(s.tasks.map((t) => [t.kind, t.name, t.status])).toEqual([
      ['marketingText', '行銷文案_純棉透氣', 'processing'],
      ['marketingImage', '行銷海報圖_春季新品', 'processing'],
    ])
    expect(s.activeCount).toBe(2)
    resolve({ poster, copy: '文案', hashtags: [] })
    await p
    expect(s.tasks.map((t) => t.status)).toEqual(['done', 'done'])
    expect(s.activeCount).toBe(0)
    expect(s.unreadCount).toBe(2)
  })

  it('只成功一半：成功那筆完成、失敗那筆顯示頁面同一句錯誤', async () => {
    const s = useGenerationTasksStore()
    await s.createMarketingTask(
      async () => ({ poster, hashtags: [], partialError: new Error('文案被擋') }),
      halves,
      errorText,
    )
    expect(byKind(s, 'marketingImage')).toMatchObject({ status: 'done', error: undefined })
    expect(byKind(s, 'marketingText')).toMatchObject({ status: 'failed', error: '錯：文案被擋', read: false })
  })

  it('全部失敗：每筆都標失敗並帶錯誤，錯誤照樣丟回給頁面', async () => {
    const s = useGenerationTasksStore()
    await expect(s.createMarketingTask(() => Promise.reject(new Error('飼料不足')), halves, errorText)).rejects.toThrow(
      '飼料不足',
    )
    expect(s.tasks.map((t) => [t.status, t.error])).toEqual([
      ['failed', '錯：飼料不足'],
      ['failed', '錯：飼料不足'],
    ])
    expect(s.unreadCount).toBe(2)
  })

  it('只要文案／只要配圖：只記呼叫端給的那一半', async () => {
    const s = useGenerationTasksStore()
    await s.createMarketingTask(async () => ({ copy: '文案', hashtags: [] }), [halves[1]!], errorText)
    expect(s.tasks.map((t) => [t.kind, t.status])).toEqual([['marketingText', 'done']])
  })

  it('圖生圖失敗：任務帶頁面同一句錯誤（不是固定的「模型逾時」）', async () => {
    const s = useGenerationTasksStore()
    await expect(
      s.trackTask('image', '圖生圖_x', 8, () => Promise.reject(new Error('飼料不足')), errorText),
    ).rejects.toThrow('飼料不足')
    expect(byKind(s, 'image')).toMatchObject({ status: 'failed', error: '錯：飼料不足', read: false })
  })

  it('圖生圖完成後未讀徽章會更新（改的是 reactive 的任務，不是原物件）', async () => {
    const s = useGenerationTasksStore()
    const p = s.trackTask('image', '圖生圖_x', 8, async () => [poster], errorText)
    // 先讀一次：畫面上的徽章在生成中就已經算過，之後要靠 reactive 觸發才會重算
    expect([s.activeCount, s.unreadCount]).toEqual([1, 0])
    await p
    expect(s.unreadCount).toBe(1)
    expect(s.activeCount).toBe(0)
  })

  it('AI 試穿：送出時進行中，完成後標完成、計入未讀，結果原樣交還頁面', async () => {
    const s = useGenerationTasksStore()
    let resolve!: (r: typeof poster) => void
    const p = s.trackTask(
      'tryon',
      'AI 試穿_白色棉T',
      6,
      () => new Promise<typeof poster>((r) => (resolve = r)),
      errorText,
    )
    expect(s.tasks.map((t) => [t.kind, t.name, t.status, t.cost])).toEqual([
      ['tryon', 'AI 試穿_白色棉T', 'processing', 6],
    ])
    expect([s.activeCount, s.unreadCount]).toEqual([1, 0])
    resolve(poster)
    await expect(p).resolves.toBe(poster)
    expect(byKind(s, 'tryon')).toMatchObject({ status: 'done', progress: 100, error: undefined, read: false })
    expect([s.activeCount, s.unreadCount]).toEqual([0, 1])
  })

  it('AI 修圖失敗：任務帶頁面同一句錯誤，錯誤照樣丟回頁面', async () => {
    const s = useGenerationTasksStore()
    const err = new Error('內容被擋')
    await expect(s.trackTask('retouch', 'AI 修圖_桌面', 8, () => Promise.reject(err), errorText)).rejects.toBe(err)
    expect(byKind(s, 'retouch')).toMatchObject({ status: 'failed', error: '錯：內容被擋', read: false })
    expect(s.unreadCount).toBe(1)
  })
})

describe('generationTasks store：影片任務（#21～#23）', () => {
  const REQ = { sourceImageId: 'img_1', modelKey: 'videoStandard', template: 'cameraPan' as const, ratio: '9:16' }
  const job = (patch: Record<string, unknown> = {}) => ({
    id: 'vt_1',
    status: 'processing',
    progress: 40,
    cost: 45,
    ...patch,
  })
  const polls = () => getVideoJob.mock.calls.length

  beforeEach(() => {
    vi.useFakeTimers()
    getFeed.mockResolvedValue({ balance: 1, monthlyLimit: null, monthUsed: 0, estImages: 0, estVideos: 0 })
    createVideoJob.mockResolvedValue({ id: 'vt_1', status: 'pending', progress: 0, cost: 45 })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('送出帶 taskName；每 3 秒輪詢一次（不是每秒）', async () => {
    const s = useGenerationTasksStore()
    getVideoJob.mockResolvedValue(job())
    await s.createVideoTask(REQ, '圖生影_鏡頭推移')
    expect(createVideoJob).toHaveBeenCalledWith({ ...REQ, taskName: '圖生影_鏡頭推移' })
    await vi.advanceTimersByTimeAsync(2999)
    expect(polls()).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(polls()).toBe(1)
    await vi.advanceTimersByTimeAsync(3000)
    expect(polls()).toBe(2)
    expect(s.tasks[0]).toMatchObject({ status: 'processing', progress: 40, videoReq: REQ })
  })

  it('輪詢遇 503 或斷線不停、不標失敗；遇 404 停止並標失敗（帶後端訊息）', async () => {
    const s = useGenerationTasksStore()
    getVideoJob
      .mockRejectedValueOnce(new ApiError({ code: 'SERVICE_UNAVAILABLE', message: '忙線', status: 503 }))
      .mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR', message: '斷線' }))
      .mockRejectedValueOnce(new ApiError({ code: 'NOT_FOUND', message: '影片任務不存在', status: 404 }))
    await s.createVideoTask(REQ, 'v')
    await vi.advanceTimersByTimeAsync(6000)
    expect(s.tasks[0].status).toBe('pending')
    await vi.advanceTimersByTimeAsync(3000)
    expect(s.tasks[0]).toMatchObject({ status: 'failed', error: '影片任務不存在', read: false })
    await vi.advanceTimersByTimeAsync(9000)
    expect(polls()).toBe(3)
  })

  it('done：更新 resultUrl／實扣額／耗時，停止輪詢、未讀＋1、刷新餘額', async () => {
    const s = useGenerationTasksStore()
    getVideoJob
      .mockResolvedValueOnce(job({ etaSeconds: 60 }))
      .mockResolvedValue(
        job({ status: 'done', progress: 100, cost: 45, resultUrl: 'https://r2/v.mp4', durationMs: 90000 }),
      )
    await s.createVideoTask(REQ, 'v')
    await vi.advanceTimersByTimeAsync(3000)
    expect(s.tasks[0].etaSeconds).toBe(60)
    getFeed.mockClear()
    await vi.advanceTimersByTimeAsync(3000)
    expect(s.tasks[0]).toMatchObject({
      status: 'done',
      progress: 100,
      resultUrl: 'https://r2/v.mp4',
      durationMs: 90000,
    })
    expect(s.unreadCount).toBe(1)
    expect(getFeed).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(9000)
    expect(polls()).toBe(2)
  })

  it('failed：failReason 翻成文案、costFeeds 歸 0（上游失敗釋放）；不認得的代碼只說生成失敗', async () => {
    const s = useGenerationTasksStore()
    getVideoJob.mockResolvedValue(job({ status: 'failed', progress: 0, cost: 0, error: 'upstreamError' }))
    await s.createVideoTask(REQ, 'v')
    await vi.advanceTimersByTimeAsync(3000)
    expect(s.tasks[0]).toMatchObject({ status: 'failed', cost: 0, error: '生成失敗・AI 服務暫時無法完成，未扣飼料' })
    expect(s.toast?.kind).toBe('failed')

    createVideoJob.mockResolvedValue({ id: 'vt_2', status: 'pending', progress: 0, cost: 45 })
    getVideoJob.mockResolvedValue(job({ id: 'vt_2', status: 'failed', error: 'somethingNew' }))
    await s.createVideoTask(REQ, 'v2')
    await vi.advanceTimersByTimeAsync(3000)
    expect(s.tasks[0].error).toBe('生成失敗')
  })

  it('restoreVideoTasks：併入不重複、當已讀、沒有 videoReq；進行中的續輪詢，已結束的不輪詢', async () => {
    const s = useGenerationTasksStore()
    await s.createVideoTask(REQ, '這個分頁送的')
    listVideoJobs.mockResolvedValue([
      job({ id: 'vt_1', name: '這個分頁送的' }),
      job({ id: 'vt_old', name: '還原測試', status: 'processing', progress: 50 }),
      job({ id: 'vt_done', name: '早就好了', status: 'done', progress: 100, resultUrl: 'u' }),
    ])
    await s.restoreVideoTasks()
    expect(s.tasks.map((t) => [t.id, t.name, t.status])).toEqual([
      ['vt_1', '這個分頁送的', 'pending'],
      ['vt_old', '還原測試', 'processing'],
      ['vt_done', '早就好了', 'done'],
    ])
    expect([s.tasks[1].read, s.tasks[1].videoReq]).toEqual([true, undefined])
    expect(s.unreadCount).toBe(0)
    getVideoJob.mockImplementation(async (id: string) => job({ id }))
    await vi.advanceTimersByTimeAsync(3000)
    expect(getVideoJob.mock.calls.map((c) => c[0]).sort()).toEqual(['vt_1', 'vt_old'])
  })

  it('restoreVideoTasks 回來前已登出（$reset）：上一個帳號的任務不併入、不輪詢', async () => {
    const s = useGenerationTasksStore()
    let resolve!: (jobs: unknown[]) => void
    listVideoJobs.mockReturnValue(new Promise((r) => (resolve = r)))
    const p = s.restoreVideoTasks()
    s.$reset()
    resolve([job({ id: 'vt_prev', status: 'processing' })])
    await p
    expect(s.tasks).toEqual([])
    await vi.advanceTimersByTimeAsync(6000)
    expect(polls()).toBe(0)
  })

  it('createVideoTask 回來前已登出（$reset）：丟 SESSION_CHANGED，不把任務塞回清單、不輪詢', async () => {
    const s = useGenerationTasksStore()
    let resolve!: (job: unknown) => void
    createVideoJob.mockReturnValue(new Promise((r) => (resolve = r)))
    const p = s.createVideoTask(REQ, 'v')
    s.$reset()
    resolve({ id: 'vt_prev', status: 'pending', progress: 0, cost: 45 })
    await expect(p).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    expect(s.tasks).toEqual([])
    await vi.advanceTimersByTimeAsync(6000)
    expect(polls()).toBe(0)
  })

  it('restoreVideoTasks 失敗只記 console，不丟錯', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    listVideoJobs.mockRejectedValue(new Error('boom'))
    await expect(useGenerationTasksStore().restoreVideoTasks()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('登出（session.discard → $reset）清空任務並停止所有輪詢', async () => {
    const s = useGenerationTasksStore()
    getVideoJob.mockResolvedValue(job())
    await s.createVideoTask(REQ, 'v')
    await vi.advanceTimersByTimeAsync(3000)
    expect(polls()).toBe(1)
    logout.mockResolvedValue(undefined)
    await useSessionStore().logout()
    expect(s.tasks).toEqual([])
    await vi.advanceTimersByTimeAsync(30000)
    expect(polls()).toBe(1)
  })
})

describe('帳號範圍的 store 以 Pinia 慣例 $reset() 重設', () => {
  // setup store 不會自動有 $reset（Pinia 開發模式呼叫會直接丟錯），要 store 自己定義並 return
  it('brand／consent／feed／generationTasks 都自備 $reset，舊名 reset 不再存在', () => {
    const stores = [useBrandStore(), useConsentStore(), useFeedStore(), useGenerationTasksStore()]
    for (const s of stores) {
      expect(() => s.$reset()).not.toThrow()
      expect('reset' in s).toBe(false)
    }
  })

  it('feed.$reset 清掉餘額與 loaded', async () => {
    getFeed.mockResolvedValue({ balance: 50, monthlyLimit: 100, monthUsed: 5, estImages: 1, estVideos: 0 })
    const feed = useFeedStore()
    await feed.refresh()
    expect(feed.loaded).toBe(true)
    feed.$reset()
    expect(feed.balance).toBe(0)
    expect(feed.loaded).toBe(false)
  })
})
