import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'library', name: 'library', component: () => import('@/views/LibraryView.vue') },
      {
        path: 'generate',
        children: [
          { path: 'image', name: 'generate-image', component: () => import('@/views/GenerateImageView.vue') },
          { path: 'post', name: 'generate-post', component: () => import('@/views/MarketingPostView.vue') },
          { path: 'video', name: 'generate-video', component: () => import('@/views/GenerateVideoView.vue') },
          { path: 'tryon', name: 'generate-tryon', component: () => import('@/views/TryOnView.vue') },
        ],
      },
      { path: 'usage', name: 'usage', component: () => import('@/views/UsageView.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/views/BrandSettingsView.vue') },
    ],
  },
]
