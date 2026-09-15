import type { Router } from 'vue-router'
import { setSessionExpiredHandler } from './http'

/** 只用到 store 的這兩件事；寫成最小介面，測試就不必造一整個 pinia store。 */
interface SessionLike {
  forceLogout: () => void
}

/**
 * 把「token 失效了要怎麼辦」接到 http 層上。
 *
 * 分工：http 層只知道「後端說這張票不能用了」，**要清 session、要導去哪一頁**
 * 是應用層的決定。所以那邊只留一個掛勾，實際行為掛在這裡。
 *
 * 抽成獨立函式（而不是寫在 main.ts 裡）是為了測得到——`main.ts` 一 import
 * 就會 `createApp().mount()`，在測試環境跑不起來。
 *
 * @returns 解除掛勾的函式（測試用；正式啟動時不需要解除）
 */
export function installSessionGuard(session: SessionLike, router: Router): () => void {
  setSessionExpiredHandler(() => {
    session.forceLogout()

    const current = router.currentRoute.value

    // 已經在登入頁就不要再導一次——那會是一個沒有終點的迴圈，
    // 而且會把 redirect 覆寫成 '/login' 本身。
    if (current.name === 'login') return

    // 記下當前位置，重新登入後可以回到原本要去的頁面。
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  })

  return () => setSessionExpiredHandler(null)
}
