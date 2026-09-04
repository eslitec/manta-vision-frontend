/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      scss: { additionalData: `@use "@/assets/scss/_variables" as *;\n@use "@/assets/scss/_mixins" as *;\n` },
    },
  },
  server: {
    // 開發時把 /api 轉給本機後端，讓瀏覽器看到的永遠只有一個來源（:5173）——
    // 跟正式環境「nginx 反向代理、前後端同網域」是同一個道理，所以後端
    // 不需要開 CORS，本機也不用另外裝 nginx。
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // 後端路由本身沒有 /api 前綴（例如 /auth/login，不是 /api/auth/login），
        // 轉發前先把前綴拿掉。正式環境 nginx 的 location /api/ 規則要用同一套
        // 前綴策略，兩邊不一致的話本機測得過、上線會全部 404。
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
