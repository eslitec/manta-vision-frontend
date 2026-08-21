## 1. 型別與錯誤碼

- [x] 1.1 `src/types/api.ts` 新增 `LoginReq { username: string; password: string }` 與 `Session { username: string; displayName: string }` 型別；驗證：`npm run build` 型別檢查通過
- [x] 1.2 依設計決策「錯誤處理沿用既有 isXxx(e) helper 慣例，不在 store 放 error ref」：`src/utils/error.ts` 新增 `INVALID_CREDENTIALS` 錯誤碼常數與 `isInvalidCredentials(e: unknown): boolean` helper，寫法比照既有的 `INSUFFICIENT_FEED`／`isInsufficientFeed`；驗證：`npm run build` 通過

## 2. Mock API

- [x] 2.1 依設計決策「Mock 帳密驗證：固定 demo 帳密，不做真後端整合」，對齊 Requirement「登入頁驗證帳號密碼」：`src/api/mock.ts` 的 `db` 新增 `session: Session | null` 欄位、新增 `DEMO_USERNAME`／`DEMO_PASSWORD` 常數（`mavis`／`mavis123`），新增 `login(username, password): Promise<Session>`（帳密相符回傳 session 並寫入 `db.session`，不符則 `throw new Error('INVALID_CREDENTIALS')`）與 `logout(): Promise<void>`（清空 `db.session`）兩個 mock 函式，比照既有 `getConsent`／`giveConsent` 的 `delay()` 與註解風格；驗證：`npm run build` 通過
- [x] 2.2 `src/api/mock.spec.ts` 新增「登入／登出」describe：正確帳密回傳 session、帳號錯誤／密碼錯誤都 reject 出 `INVALID_CREDENTIALS`、`logout()` 呼叫後不拋錯；驗證：`npm test -- --run` 該檔案全部通過

## 3. Session store 與登入狀態持久化

- [x] 3.1 依設計決策「登入狀態存 localStorage，並在 main.ts 啟動時還原」，對齊 Requirement「登入狀態在重新整理後維持」：新增 `src/stores/session.ts`（`useSessionStore`），提供 `session`、`loading`、`isAuthenticated`（computed）、`restore()`（從 `localStorage` key `mv_session` 讀回並 `JSON.parse`，失敗則清除髒資料）、`login(username, password)`（呼叫 `api.login`，成功寫入 `session` 與 `localStorage`）、`logout()`（呼叫 `api.logout`，清空 `session` 與 `localStorage`）；驗證：`npm run build` 通過
- [x] 3.2 `src/main.ts` 在 `app.use(createPinia())` 之後、`app.use(router)` 之前呼叫 `useSessionStore().restore()`；驗證：手動測試重新整理已登入頁面不會被導去登入頁（見第 7 節）
- [x] 3.3 依設計決策「測試環境沒有原生 localStorage，用 vi.stubGlobal 模擬」：`src/stores/stores.spec.ts` 的 `vi.mock('@/api', ...)` 補上 `login`／`logout` 兩個 `vi.fn()`，測試檔開頭用 `vi.stubGlobal('localStorage', ...)` 塞入以 `Map` 實作的最小 shim（`getItem`／`setItem`／`removeItem`／`clear`），並在 `beforeEach` 清空；新增「session store」describe：登入成功寫入 `session` 與 `localStorage`、帳密錯誤時 `session` 維持 `null` 且呼叫端會 reject、`restore()` 從預先塞好的 `localStorage` 值還原 `session`、`logout()` 清空 `session` 與 `localStorage`；驗證：`npm test -- --run` 該檔案全部通過

## 4. 路由守衛

- [x] 4.1 依設計決策「`/login` 獨立於 DefaultLayout 之外的頂層路由」，為 Requirement「未登入時導向登入頁」與 Requirement「已登入時訪問登入頁自動導回」提供路由基礎：`src/router/routes.ts` 新增獨立頂層路由項目 `{ path: '/login', name: 'login', meta: { public: true, titleKey: 'routeTitles.login' }, component: () => import('@/views/LoginView.vue') }`，與現有 `{ path: '/', component: DefaultLayout, children: [...] }` 同層並列，不套用 `DefaultLayout`；驗證：`npm run build` 通過
- [x] 4.2 依設計決策「路由守衛用 meta.public 旗標而非比對路由名稱」，對齊 Requirement「未登入時導向登入頁」與 Requirement「登入成功導回原本要去的頁面」與 Requirement「已登入時訪問登入頁自動導回」：`src/router/index.ts` 新增 `router.beforeEach`，在 callback 內部呼叫 `useSessionStore()`（不放在 module 頂層）：未登入且 `to.meta.public !== true` 時導向 `{ name: 'login', query: { redirect: to.fullPath } }`；已登入且 `to.name === 'login'` 時導向 `to.query.redirect`（字串時）或 `/`；驗證：`npm run build` 通過
- [x] 4.3 `src/router/router.spec.ts` 新增獨立 `describe('auth guard', ...)`：用 `createMemoryHistory` 建自己的 router 並掛上與 `index.ts` 相同的 `beforeEach` 邏輯，`beforeEach` 裡 `setActivePinia(createPinia())`；案例：未登入訪問受保護路由導向 `/login` 並帶 `redirect` query、未登入訪問 `/login` 不產生導向迴圈、已登入訪問 `/login` 導向 `/` 或 `redirect`、已登入訪問受保護路由正常放行；驗證：`npm test -- --run` 該檔案全部通過

## 5. 登入頁與文案

- [x] 5.1 對齊 Requirement「登入頁驗證帳號密碼」：新增 `src/views/LoginView.vue`（`<script setup lang="ts">` + `template lang="pug">` + `<style scoped lang="scss">`），帳號欄（`type="text"`, `autocomplete="username"`）與密碼欄（`type="password"`, `autocomplete="current-password"`）比照 `SaveAssetDialog.vue` 的欄位樣式，`<form @submit.prevent="submit">` 搭配 `AppButton(native-type="submit" :loading="session.loading")`；`submit()` 呼叫 `session.login(...)`，成功時 `router.push` 到 `route.query.redirect`（字串時）或 `/`，失敗時 `catch` 用 `isInvalidCredentials(e)` 判斷後顯示 `t('errors.invalidCredentials')`；驗證：`npm run build` 通過，手動測試輸入正確／錯誤帳密的畫面行為（見第 7 節）
- [x] 5.2 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts` 兩邊同步新增：`routeTitles.login`、`errors.invalidCredentials`、新的 `auth` 區塊（`title`／`usernameLabel`／`usernamePlaceholder`／`passwordLabel`／`passwordPlaceholder`／`submit`），兩邊 key 結構一致；驗證：`npm run build` 通過、`npx prettier --check src/lang/zh-Hant.ts src/lang/en.ts` 通過

## 6. DefaultLayout 串接

- [x] 6.1 對齊 Requirement「提供登出功能」：`src/layouts/DefaultLayout.vue` 匯入 `useSessionStore`／`useRouter`，`t('layout.owner', { name: 'Mavis' })` 改成 `t('layout.owner', { name: session.session?.displayName ?? '' })`；`span.sidebar__footerLink {{ t('layout.logout') }}` 改成 `button.sidebar__footerLink(type="button" @click="handleLogout")`，新增 `handleLogout()`（呼叫 `session.logout()` 後 `router.push({ name: 'login' })`），CSS 補上 `border:none;background:none;text-align:left;cursor:pointer;font:inherit` 讓 `button` 視覺維持與原本 `span` 一致；驗證：`npm run build` 通過，手動測試點擊登出的畫面行為（見第 7 節）

## 7. 驗證

- [x] 7.1 執行 `npm run build`（`vue-tsc --noEmit` + `vite build`），確認全部通過
- [x] 7.2 執行 `npm run lint` 與 `npx prettier --check` 本次改動到的檔案，確認全部通過
- [x] 7.3 執行 `npm test -- --run`，確認含新增測試在內全部通過
- [x] 7.4 啟動 `npm run dev`，手動瀏覽器驗證：清空 `localStorage` 後訪問 `/` 被導去 `/login`；輸入錯誤帳密顯示錯誤訊息且不導頁；輸入 `mavis`／`mavis123` 導向原本要去的頁面（先深連結 `/library` 再登入測試 redirect）；重新整理仍維持登入、topbar 顯示「Mavis｜擁有者」；點擊側邊欄「登出」清除狀態並導回 `/login`，重整後仍是登出狀態；已登入時直接訪問 `/login` 自動導回首頁；`spectra validate login-gate --strict` 通過
