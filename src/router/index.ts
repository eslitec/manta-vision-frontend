import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'library', name: 'library', component: () => import('@/views/LibraryView.vue') },
      { path: 'generate/image', name: 'generate-image', component: () => import('@/views/GenerateImageView.vue') },
      { path: 'generate/post', name: 'generate-post', component: () => import('@/views/MarketingPostView.vue') },
      { path: 'generate/video', name: 'generate-video', component: () => import('@/views/GenerateVideoView.vue') },
      { path: 'generate/tryon', name: 'generate-tryon', component: () => import('@/views/TryOnView.vue') },
      { path: 'usage', name: 'usage', component: () => import('@/views/UsageView.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/views/BrandSettingsView.vue') },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
