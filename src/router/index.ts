import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { i18n } from '@/lang'
import { useSessionStore } from '@/stores/session'

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

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

router.afterEach((to) => {
  const titleKey = to.meta.titleKey
  document.title = titleKey ? `${i18n.global.t(titleKey as string)} | Manta Vision` : 'Manta Vision'
})

export { routes }
