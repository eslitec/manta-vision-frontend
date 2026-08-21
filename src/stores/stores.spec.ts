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
  it('登入成功寫入 session 與 localStorage', async () => {
    login.mockResolvedValue({ username: 'mavis', displayName: 'Mavis' })
    const session = useSessionStore()
    await session.login('mavis', 'mavis123')
    expect(session.session).toEqual({ username: 'mavis', displayName: 'Mavis' })
    expect(session.isAuthenticated).toBe(true)
    expect(localStorage.getItem('mv_session')).toBe(JSON.stringify({ username: 'mavis', displayName: 'Mavis' }))
  })

  it('帳密錯誤時 session 維持 null 且呼叫端會 reject', async () => {
    login.mockRejectedValue(new Error('INVALID_CREDENTIALS'))
    const session = useSessionStore()
    await expect(session.login('mavis', 'wrong')).rejects.toThrow('INVALID_CREDENTIALS')
    expect(session.session).toBeNull()
    expect(session.isAuthenticated).toBe(false)
  })

  it('restore 從預先塞好的 localStorage 值還原 session', () => {
    localStorage.setItem('mv_session', JSON.stringify({ username: 'mavis', displayName: 'Mavis' }))
    const session = useSessionStore()
    session.restore()
    expect(session.session).toEqual({ username: 'mavis', displayName: 'Mavis' })
    expect(session.isAuthenticated).toBe(true)
  })

  it('logout 清空 session 與 localStorage', async () => {
    login.mockResolvedValue({ username: 'mavis', displayName: 'Mavis' })
    logout.mockResolvedValue(undefined)
    const session = useSessionStore()
    await session.login('mavis', 'mavis123')
    await session.logout()
    expect(session.session).toBeNull()
    expect(localStorage.getItem('mv_session')).toBeNull()
  })
})
