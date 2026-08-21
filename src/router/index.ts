import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { i18n } from '@/lang'

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach((to) => {
  const titleKey = to.meta.titleKey
  document.title = titleKey ? `${i18n.global.t(titleKey as string)} | Manta Vision` : 'Manta Vision'
})

export { routes }
