## Why

Manta Vision 前端目前沒有任何帳號系統：任何人只要知道網址就能直接進入系統操作（生成、編輯、修改品牌設定等）。topbar 顯示的「Mavis｜擁有者」是寫死在 `DefaultLayout.vue` 裡的字面值，側邊欄的「登出」也只是個沒有綁定行為的裝飾文字，`src/router/` 完全沒有存取控制。需要一個登入頁，讓使用者輸入帳號密碼通過驗證後才能進入系統其餘頁面，並提供真正可用的登出。

## What Changes

- 新增獨立的 `/login` 全頁路由（不套用 `DefaultLayout`，沒有側邊欄／topbar），提供帳號密碼登入表單。
- 新增全站路由守衛：未登入時，除了 `/login` 以外的任何路由都會被導去 `/login`（並記住原本要去的路徑，登入成功後導回去）；已登入時直接訪問 `/login` 會被導回首頁。
- 登入狀態存進 `localStorage`，重新整理瀏覽器後仍維持登入；提供登出功能，把側邊欄現有的「登出」文字接上真正的登出行為（清除登入狀態並導回 `/login`）。
- Mock API 新增登入／登出端點，使用固定的 demo 帳號密碼驗證（純前端 mock，不接真實後端、不做密碼雜湊）。
- topbar 顯示的使用者名稱改為從登入狀態讀取，取代目前寫死的「Mavis」字面值。

## Capabilities

### New Capabilities

- `login-gate`：帳號密碼登入與全站存取控制——提供登入頁、登入／登出的 mock API、路由守衛（未登入導去登入頁、已登入時登入頁導回原目的地）、登入狀態持久化（重新整理後維持登入）。

### Modified Capabilities

（無）

## Impact

- 新增：
  - `src/views/LoginView.vue`
  - `src/stores/session.ts`
- 修改：
  - `src/api/mock.ts`（新增 login／logout 端點與 demo 帳密）
  - `src/types/api.ts`（新增 `LoginReq`、`Session` 型別）
  - `src/utils/error.ts`（新增 `INVALID_CREDENTIALS` 錯誤碼與判斷 helper）
  - `src/router/routes.ts`（新增獨立的 `/login` 路由）
  - `src/router/index.ts`（新增 `beforeEach` 路由守衛）
  - `src/main.ts`（App 啟動時還原登入狀態）
  - `src/layouts/DefaultLayout.vue`（topbar 使用者名稱改讀登入狀態、側邊欄登出接上真正行為）
  - `src/lang/zh-Hant.ts`、`src/lang/en.ts`（新增登入頁與錯誤訊息文案，兩邊 key 結構一致）
