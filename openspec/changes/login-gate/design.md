## Context

Manta Vision 前端目前完全沒有帳號系統：`src/api/mock.ts` 沒有任何登入相關資料，`src/router/`（`index.ts`／`routes.ts`）沒有任何存取控制，`src/router/routes.ts` 目前唯一的頂層項目是 `{ path: '/', component: DefaultLayout, children: [...] }`，所有頁面都包在 `DefaultLayout` 底下。topbar 顯示的「Mavis｜擁有者」是寫死在 `DefaultLayout.vue` 模板裡的字面值（`t('layout.owner', { name: 'Mavis' })`），側邊欄的「登出」是沒有綁定任何行為的 `span.sidebar__footerLink`。`src/api/http.ts` 有 `ctx.token` 的預留欄位與 401 錯誤處理的 TODO 註解，但目前 mock API 完全不經過 `http`，是留給未來真後端的掛勾，這次不會用到。

## Goals / Non-Goals

**Goals:**

- 未登入使用者存取任何受保護頁面時，一律被導去 `/login`。
- 提供帳號密碼登入表單，驗證通過後導回原本要去的頁面（deep link 保留）。
- 登入狀態存 `localStorage`，重新整理瀏覽器後仍維持登入。
- 提供真正可用的登出，清除登入狀態並導回 `/login`。
- topbar 顯示的使用者名稱改為從登入狀態讀取。

**Non-Goals:**

- 不做註冊、忘記密碼、多帳號切換。
- 不接真實後端、不做密碼雜湊——這是純前端 mock 專案，帳密驗證固定寫死在 mock API 裡。
- 不處理 `src/api/http.ts` 的 `ctx.token`／401 攔截整合，僅在程式碼留一行 TODO 註解標記未來掛勾點，不實作。

## Decisions

### `/login` 獨立於 DefaultLayout 之外的頂層路由

`/login` 頁面不需要側邊欄／topbar，因此在 `src/router/routes.ts` 加一個獨立的頂層路由項目（跟 `{ path: '/', component: DefaultLayout, children: [...] }` 同層並列），而不是塞進 `DefaultLayout` 的 `children` 裡。這是這個路由結構第一次出現「不套用 DefaultLayout 的頁面」，之後如果要加註冊、忘記密碼等公開頁面可以比照辦理。

### 路由守衛用 meta.public 旗標而非比對路由名稱

`src/router/index.ts` 新增 `router.beforeEach`，透過 `to.meta.public === true` 判斷是否為公開路由，而不是寫死比對 `to.name === 'login'`。原因：往後若新增其他公開頁面（例如未來的忘記密碼頁），只要在該路由物件補一個 `meta: { public: true }` 就能沿用同一套守衛邏輯，不必回頭修改 guard 本身的判斷式。守衛在未登入時導向 `/login` 並帶上 `redirect` query 記住原目的地；已登入時若停留在 `/login` 則導回 `redirect` 或首頁。

### 登入狀態存 localStorage，並在 main.ts 啟動時還原

新增 `src/stores/session.ts`（`useSessionStore`），登入成功後把 session 物件序列化存進 `localStorage`（key `mv_session`），並提供 `restore()` 從 `localStorage` 讀回。`restore()` 必須在 `src/main.ts` 裡於 `app.use(createPinia())` 之後、`app.use(router)` 之前呼叫一次，確保路由守衛第一次執行 `beforeEach` 時，登入狀態已經還原完成，不會因為還原時機太晚而把已登入使用者誤判成未登入、閃一下被導去登入頁。

### 錯誤處理沿用既有 isXxx(e) helper 慣例，不在 store 放 error ref

專案既有的錯誤處理慣例是 `src/utils/error.ts` 的「錯誤碼常數 + `isXxx(e)` helper」模式（例如 `INSUFFICIENT_FEED`／`isInsufficientFeed`），view 端 catch 後用 helper 判斷再對應到 i18n 訊息（見 `GenerateVideoView.vue` 的 `errorMsg.value = isInsufficientFeed(e) ? t('errors.insufficientFeed') : t('errors.submitFailed')`）。登入錯誤比照這個既有慣例：新增 `INVALID_CREDENTIALS` 常數與 `isInvalidCredentials(e)` helper，`useSessionStore` 的 `login()` 只負責讓 mock API 拋出的錯誤往外傳，不在 store 裡另外維護一個 `error` ref——錯誤訊息的翻譯與顯示邏輯留在 `LoginView.vue` 處理，維持跟其他頁面一致的分工方式。

### Mock 帳密驗證：固定 demo 帳密，不做真後端整合

`src/api/mock.ts` 的 `db` 新增 `session` 欄位，新增 `login`／`logout` 兩個 mock 函式，比照既有 `getConsent`／`giveConsent` 的寫法（`await delay(ms)` 模擬延遲、`throw new Error('CODE')` 模擬錯誤）。帳密驗證對比固定寫死的 `DEMO_USERNAME`／`DEMO_PASSWORD` 常數（對齊 topbar 現有顯示的「Mavis」人設），錯誤時拋出 `Error('INVALID_CREDENTIALS')`。這是刻意的簡化：專案沒有真實後端，做密碼雜湊或多帳號資料庫沒有實質意義，反而會讓 mock 邏輯複雜化。

### 測試環境沒有原生 localStorage，用 vi.stubGlobal 模擬

`vite.config.ts` 的 `test.environment` 是 `'node'`（非 `jsdom`，且 `jsdom` 目前不是 devDependency），Node 22 預設也沒有全域 `localStorage`。`src/stores/stores.spec.ts` 新增的 session store 測試必須在測試檔內用 `vi.stubGlobal('localStorage', <記憶體 shim>)` 自行模擬一個最小的 `localStorage` 實作（`getItem`／`setItem`／`removeItem`／`clear`，用 `Map` 存資料），不改動 `vite.config.ts` 的 `test.environment` 設定或新增 `jsdom` 依賴——那是影響全專案測試套件的工具鏈變動，超出這次「登入功能」的範圍。

## Implementation Contract

**行為（使用者可觀察到的）：**

- 未登入時訪問任何非 `/login` 的路由，瀏覽器網址列會被導向 `/login?redirect=<原本要去的完整路徑>`。
- 在 `/login` 輸入正確帳密（demo 帳密：帳號 `mavis`、密碼 `mavis123`）並送出後，導向 `redirect` query 指定的路徑（沒有則導向 `/`），topbar 顯示「Mavis｜擁有者」。
- 輸入錯誤帳號或密碼送出後，畫面停留在 `/login`，顯示錯誤訊息「帳號或密碼錯誤，請再試一次。」（`t('errors.invalidCredentials')`），不導頁。
- 登入成功後重新整理瀏覽器，仍維持登入狀態、停留在原路徑，不會被導回 `/login`。
- 點擊側邊欄「登出」後，登入狀態被清除並導向 `/login`；重新整理瀏覽器後仍是登出狀態（不會因為快取又自動登入）。
- 已登入狀態下直接訪問 `/login`，會立即被導向 `/`（或有 `redirect` query 時導向該路徑）。

**介面／資料形狀：**

- `src/types/api.ts` 新增 `LoginReq { username: string; password: string }`、`Session { username: string; displayName: string }`。
- `src/api/mock.ts` 的 `mockApi` 新增 `login(username: string, password: string): Promise<Session>`（對應 `POST /auth/login`）、`logout(): Promise<void>`（對應 `POST /auth/logout`）。
- `src/stores/session.ts` 的 `useSessionStore` 對外提供：`session: Ref<Session | null>`、`loading: Ref<boolean>`、`isAuthenticated: ComputedRef<boolean>`、`restore(): void`、`login(username: string, password: string): Promise<void>`、`logout(): Promise<void>`。
- `localStorage` 存放 key 為 `mv_session`，值為 `JSON.stringify(session)`。

**失敗模式：**

- 帳號或密碼錯誤：`mockApi.login` 拋出 `Error('INVALID_CREDENTIALS')`，`useSessionStore.login()` 讓錯誤往外傳（不吞掉、不轉型），`LoginView.vue` 用 `isInvalidCredentials(e)` 判斷後顯示對應錯誤文案，`session.value` 維持原值（不會被清空或設成部分資料）。
- `localStorage` 內容損毀（無法 `JSON.parse`）：`restore()` 捕捉例外、清除該筆髒資料（`localStorage.removeItem`），視同未登入，不拋出例外中斷 App 啟動流程。

**驗收標準：**

- `spectra validate login-gate --strict` 通過。
- `npm run build`（`vue-tsc --noEmit` + `vite build`）通過。
- `npm test -- --run` 全數通過，含新增的 mock 登入／登出測試（`src/api/mock.spec.ts`）、session store 測試（`src/stores/stores.spec.ts`）、路由守衛測試（`src/router/router.spec.ts`）。
- 手動瀏覽器驗證（見 tasks.md 第 5 節）：清空 `localStorage` 後訪問 `/` 被導去 `/login`；錯誤帳密顯示錯誤訊息且不導頁；正確帳密登入後導向原本要去的頁面；重整後維持登入；登出後清除狀態並導回 `/login`；已登入時訪問 `/login` 自動導回首頁。

**範圍邊界：**

- **In scope**：`/login` 路由與頁面、路由守衛、session store 與 `localStorage` 持久化、mock 登入／登出 API、topbar 使用者名稱與側邊欄登出的串接、對應的 i18n 文案（繁中／英文）。
- **Out of scope**：註冊、忘記密碼、多帳號切換、真實後端串接、密碼雜湊、`src/api/http.ts` 的 `ctx.token`／401 攔截實際串接（僅留 TODO 註解）。

## Risks / Trade-offs

- [固定 demo 帳密寫死在前端原始碼裡，任何看得到原始碼的人都能取得帳密] → 這是純前端 mock 專案本來就有的限制（沒有真實後端可以藏密碼），不是這次變更引入的新風險；真正需要保護的地方是未來接真實後端時才處理，目前僅做「先登入才能用」的操作性門檻，不是安全機制。
- [`beforeEach` 守衛在每次導覽都呼叫 `useSessionStore()`，若 Pinia 尚未安裝會拋錯] → `main.ts` 保證 `app.use(createPinia())` 先於 `app.use(router)` 執行，且 `beforeEach` 只在導覽當下（而非 module 載入時）才存取 store，兩者順序已確定安全；`router.spec.ts` 的既有測試直接 `import { routes }` 建立獨立 router、不經過 `index.ts`，因此不受影響。
- [`localStorage` 資料格式若未來改變（例如 `Session` 欄位新增必填屬性），舊資料可能與新型別不相容] → `restore()` 用 `try/catch` 包住 `JSON.parse` 與後續存取，格式不符時視同未登入並清除髒資料，不會讓 App 啟動失敗。
