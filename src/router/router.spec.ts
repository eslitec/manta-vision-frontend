import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { routes } from './routes'
import { useSessionStore } from '@/stores/session'

describe('generate routes', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  it.each([
    ['/generate/image', 'generate-image'],
    ['/generate/post', 'generate-post'],
    ['/generate/video', 'generate-video'],
    ['/generate/tryon', 'generate-tryon'],
  ])('preserves %s as route %s', (path, name) => {
    expect(router.resolve(path).name).toBe(name)
  })
})

// 這裡刻意不 import ./index 的真正 router singleton（它用 createWebHistory，
// 不適合 Node 測試環境），而是自己建一個 createMemoryHistory router，
// 掛上跟 index.ts 相同的 beforeEach 邏輯來測試 guard 行為。
describe('auth guard', () => {
  function createTestRouter() {
    const router = createRouter({ history: createMemoryHistory(), routes })
    router.beforeEach((to) => {
      const session = useSessionStore()
      const isPublic = to.meta.public === true
      if (!session.isAuthenticated && !isPublic) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }
      if (session.isAuthenticated && to.name === 'login') {
        const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/'
        return redirect
      }
      return true
    })
    return router
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('未登入訪問受保護路由導向 /login 並帶 redirect query', async () => {
    const router = createTestRouter()
    await router.push('/library')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/library')
  })

  it('未登入訪問 /login 不產生導向迴圈', async () => {
    const router = createTestRouter()
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('已登入訪問 /login 帶 redirect 時導向該路徑', async () => {
    const router = createTestRouter()
    const session = useSessionStore()
    session.session = { username: 'mavis', displayName: 'Mavis' }
    await router.push('/login?redirect=/library')
    expect(router.currentRoute.value.path).toBe('/library')
  })

  it('已登入訪問 /login 沒有 redirect 時導向首頁', async () => {
    const router = createTestRouter()
    const session = useSessionStore()
    session.session = { username: 'mavis', displayName: 'Mavis' }
    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('已登入訪問受保護路由正常放行', async () => {
    const router = createTestRouter()
    const session = useSessionStore()
    session.session = { username: 'mavis', displayName: 'Mavis' }
    await router.push('/library')
    expect(router.currentRoute.value.name).toBe('library')
  })
})
