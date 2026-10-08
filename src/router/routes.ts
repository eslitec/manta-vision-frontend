import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'home', meta: { titleKey: 'routeTitles.home' }, component: () => import('@/views/HomeView.vue') },
      { path: 'library', name: 'library', meta: { titleKey: 'routeTitles.library' }, component: () => import('@/views/LibraryView.vue') },
      {
        path: 'generate',
        children: [
          { path: 'image', name: 'generate-image', meta: { titleKey: 'routeTitles.generateImage' }, component: () => import('@/views/GenerateImageView.vue') },
          { path: 'post', name: 'generate-post', meta: { titleKey: 'routeTitles.generatePost' }, component: () => import('@/views/MarketingPostView.vue') },
          { path: 'video', name: 'generate-video', meta: { titleKey: 'routeTitles.generateVideo' }, component: () => import('@/views/GenerateVideoView.vue') },
          { path: 'tryon', name: 'generate-tryon', meta: { titleKey: 'routeTitles.generateTryOn' }, component: () => import('@/views/TryOnView.vue') },
        ],
      },
      { path: 'usage', name: 'usage', meta: { titleKey: 'routeTitles.usage' }, component: () => import('@/views/UsageView.vue') },
      { path: 'settings', name: 'settings', meta: { titleKey: 'routeTitles.settings' }, component: () => import('@/views/BrandSettingsView.vue') },
    ],
  },
]
