/// <reference types="vite/client" />

// 宣告本專案用到的環境變數，讓 `import.meta.env.VITE_*` 有型別與自動完成。
// 沒宣告的話打錯字（VITE_USE_MOCKS）會是 undefined，靜靜地走到錯的分支。
interface ImportMetaEnv {
  /** 後端 API 位址；不設定時走 '/api' */
  readonly VITE_API_BASE?: string
  /** 設成字串 'false' 才會打真後端；其餘一律用假資料 */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
