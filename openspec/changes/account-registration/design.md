## Context

`login-gate`（已實作 17/17）目前只有一組寫死在 `src/api/mock.ts` 的 demo 帳密（`DEMO_USERNAME`/`DEMO_PASSWORD`），`db.session` 是單一個全域 session，完全沒有「使用者清單」的概念。`LoginView.vue` 剛完成 `login-visual-refresh`，改為「全螢幕背景圖 + 懸浮不透明白色卡片 + MantaGO logo」版型。這次要新增註冊頁 `/register`，讓使用者能自建帳號並登入，視覺沿用登入頁剛定案的外殼。設計稿在使用者本機的 Pencil 檔案（`login-redesign-restored.pen`，Screen D／frame id `wUfTV` 是註冊頁，Screen C／frame id `iMfgU` 是更新後含註冊連結的登入頁），欄位規則已在需求訪談中定案：帳號 3–50 bytes、密碼 8–72 bytes，無確認密碼、無顯示名稱欄位。

## Goals / Non-Goals

**Goals:**

- 新增 `/register` 路由與 `RegisterView.vue`，提供帳號／密碼註冊表單。
- Mock API 支援多個使用者帳號（不再只有單一 demo 帳號），註冊會建立一筆新帳號並可用於之後登入。
- 註冊成功自動登入並導向首頁；帳號重複顯示錯誤訊息並停留在註冊頁。
- 登入頁與註冊頁互相提供對方的連結。
- 登入頁與註冊頁共用的視覺（全螢幕背景、懸浮卡片、logo、輸入框樣式）不重複撰寫兩份完整 SCSS。

**Non-Goals:**

- 不做 email 驗證、找回密碼、多因素驗證等帳號系統的其他功能。
- 不做真實密碼雜湊或後端持久化——沿用 `login-gate` 既有的 mock／`localStorage` 模式，密碼以明碼存在 mock 記憶體中（僅供前端展示用）。
- 不新增確認密碼欄位、不新增顯示名稱欄位（已於需求訪談中排除）。
- 不改動 `login-gate` 既有的帳密驗證、路由守衛、登入狀態持久化、登出 Requirement，僅新增登入頁的註冊連結。
- 不處理 demo 帳號（`mavis`/`mavis123`）與新註冊帳號並存時的特殊互動，demo 帳號視為 mock 使用者清單裡預先存在的一筆資料即可。

## Decisions

### Mock 使用者清單改為可擴充的帳號集合

`src/api/mock.ts` 的 `db` 新增 `users: Map<string, { password: string; displayName: string }>`，初始化時塞入既有的 demo 帳號（`mavis` → `{ password: 'mavis123', displayName: 'Mavis' }`）。`login()` 改為查 `db.users`（帳號不存在或密碼不符皆丟 `INVALID_CREDENTIALS`，不區分兩者原因，避免帳號列舉），取代原本寫死比對 `DEMO_USERNAME`/`DEMO_PASSWORD` 的邏輯。新增 `register(username, password)`：若 `db.users.has(username)` 已存在則丟 `USERNAME_TAKEN`；否則寫入 `db.users`（`displayName` 設為 `username`），建立 `db.session` 並回傳 `Session`，行為與 `login()` 一致（同樣是「建立 session 並回傳」）。

備選方案：保留單一 demo 帳號、註冊時另外存一個獨立變數。放棄，因為只能支援一個註冊帳號，無法驗證「帳號重複」情境，而且跟 `login-gate` 既有的單帳號硬編碼一樣是技術債，不如藉這次一起換成清單結構。

### 註冊即自動登入，複用 session store 既有機制

`src/stores/session.ts` 新增 `register(username, password)` action，呼叫 `api.register(...)` 取得 `Session` 後，比照 `login()` 現有邏輯設定 `session.value` 並寫入 `localStorage`（`STORAGE_KEY`）。`RegisterView.vue` 呼叫 `session.register(...)` 成功後直接 `router.push('/')`，不透過 `redirect` query（註冊入口本來就在登入頁，不會帶有原始目的地）。

### 登入頁與註冊頁共用視覺樣式，抽成 SCSS mixin

登入頁的 `.loginView` 樣式區塊（全螢幕背景、懸浮卡片、輸入框、按鈕留白等，約 80 行）與註冊頁需要的樣式幾乎完全一致，只有欄位數量與文案不同。把這段共用樣式抽成 `src/assets/scss/_mixins.scss` 裡的新 mixin `@mixin authCard`，內容涵蓋容器背景圖／置中、卡片（不透明白底、圓角、陰影）、logo 尺寸、欄位 label／input／error 樣式、submit 按鈕寬度、以及卡片下方連結列（prompt 文字＋連結文字）的樣式。`LoginView.vue` 與 `RegisterView.vue` 的 `<style>` 區塊都改成 `.loginView { @include authCard; }` / `.registerView { @include authCard; }`，各自保留自己的 BEM 命名空間（`__panel`、`__field` 等 class 名稱不變，只是規則定義移進 mixin）。

備選方案：抽成獨立的 `AuthCardLayout.vue` 元件，用 slot 包住表單內容。放棄，因為 Vue 的 scoped style 對 slot 內容需要額外的 `:deep()` 穿透寫法，且本專案既有慣例本來就是「少量共用樣式在 `src/assets/scss/`」（見 `CLAUDE.md`），用 mixin 更貼近既有作法，範本結構本身（欄位數量不同）也不適合硬包進共用元件裡。

### 帳號／密碼欄位驗證規則

前端在 `RegisterView.vue` 的 `submit()` 送出前，先做長度檢查（`username` 3–50 bytes、`password` 8–72 bytes，用 `TextEncoder().encode(str).length` 算 byte 長度，因為中文字元在 UTF-8 下佔 3 bytes，不能直接用 `str.length`）；不符合時直接在畫面顯示對應錯誤訊息，不呼叫 mock API。Mock API 端（`register()`）不重複做長度驗證——前端已經擋，mock 只負責「帳號是否已存在」這個無法在前端單獨判斷的邏輯。

## Implementation Contract

- **Behavior**：使用者訪問 `/register`，看到與登入頁一致的全螢幕背景＋懸浮白色卡片＋logo，欄位為帳號／密碼，按鈕文案「註冊」。輸入不符合長度限制送出時，畫面顯示對應錯誤訊息、不呼叫 API。輸入合法但帳號已存在時，畫面顯示「此帳號已被使用，請換一個帳號。」，停留在註冊頁。輸入合法且帳號不存在時，畫面建立登入狀態並導向首頁 `/`，與登入成功後的畫面（topbar 使用者名稱顯示 `displayName`）一致。登入頁卡片下方新增「還沒有帳號？註冊」連結（點擊導向 `/register`）；註冊頁卡片下方新增「已經有帳號？登入」連結（點擊導向 `/login`）。
- **Interface / data shape**：
  - `src/types/api.ts` 新增 `export interface RegisterReq { username: string; password: string }`。
  - `src/api/mock.ts` 的 `api` 物件新增 `async register(username: string, password: string): Promise<Session>`；`db` 新增 `users: Map<string, { password: string; displayName: string }>`，初始值包含 demo 帳號 `mavis`。
  - `src/stores/session.ts` 的 `useSessionStore` 新增 `register(username: string, password: string): Promise<void>` action，內部呼叫 `api.register`、設定 `session.value`、寫入 `localStorage`，行為與既有 `login()` 對稱。
  - `src/utils/error.ts` 新增 `export const USERNAME_TAKEN = 'USERNAME_TAKEN'` 與 `export function isUsernameTaken(e: unknown): boolean`，比照既有 `isInvalidCredentials` 的寫法。
  - `src/router/routes.ts` 新增 `{ path: '/register', name: 'register', meta: { public: true, titleKey: 'routeTitles.register' }, component: () => import('@/views/RegisterView.vue') }`，緊鄰既有 `/login` 路由。
- **Failure modes**：
  - 前端長度驗證失敗：不呼叫 API，直接顯示對應錯誤文字（帳號過短／過長、密碼過短／過長），欄位標記 `aria-invalid`。
  - Mock API 丟 `USERNAME_TAKEN`：畫面顯示「此帳號已被使用，請換一個帳號。」，停留在註冊頁，行為比照 `LoginView.vue` 現有的 `isInvalidCredentials` catch 判斷模式。
  - 非上述兩種錯誤（不應發生於 mock 環境）：`throw e`，不吞掉例外，比照 `LoginView.vue` 既有的 `else throw e` 寫法。
- **Acceptance criteria**：
  - `npm run build`（`vue-tsc --noEmit` + vite build）通過。
  - `npm run lint` 通過。
  - 手動測試：帳號 `ab`（2 字，短於下限）送出，顯示帳號長度錯誤，不呼叫 API。
  - 手動測試：帳號 `newuser`、密碼 `1234567`（7 字，短於下限）送出，顯示密碼長度錯誤，不呼叫 API。
  - 手動測試：帳號 `mavis`（demo 帳號，已存在）、密碼 `anypass123` 送出，顯示「此帳號已被使用，請換一個帳號。」，停留在註冊頁。
  - 手動測試：帳號 `newuser001`、密碼 `password123` 送出，成功建立登入狀態並導向首頁；重新整理瀏覽器後仍維持登入（沿用 `login-gate` 既有的持久化機制）；登出後可用 `newuser001`／`password123` 重新登入成功。
  - 手動測試：登入頁點擊「註冊」連結導向 `/register`；註冊頁點擊「登入」連結導向 `/login`。
- **Scope boundaries**：僅新增 `src/views/RegisterView.vue`、修改 `src/views/LoginView.vue`（新增連結列與 mixin 套用）、`src/api/mock.ts`、`src/types/api.ts`、`src/utils/error.ts`、`src/router/routes.ts`、`src/stores/session.ts`、`src/assets/scss/_mixins.scss`、`src/lang/zh-Hant.ts`、`src/lang/en.ts`。不修改 `login-gate` 既有的路由守衛邏輯（`src/router/index.ts` 的 `beforeEach`）、不修改 `AppButton.vue` 等共用元件、不修改 `DefaultLayout.vue`。

## Risks / Trade-offs

- [Mock 密碼以明碼存在記憶體，且 `db.users` 只存在於單次頁面 session（重新整理不會重置，因為整個 mock db 是模組層級單例，但關掉分頁再開新分頁會重置）] → 這是 `login-gate` 既有 mock 架構本來就有的限制，本次不處理，注意事項寫進 `RegisterView.vue` 附近的既有 `TODO(真後端)` 註解慣例即可，不在本次範圍內修正。
- [前端 byte 長度驗證與 mock API 沒有再次驗證，若之後串接真後端，後端仍須自己做長度驗證] → 已在 Non-Goals 註明本次是純前端 mock，真後端串接時需要另外補上伺服器端驗證，屬於後續 change。
- [`login()` 改成查 `db.users` 而非直接比對寫死帳密，可能影響 `login-gate` 既有的 17 個已完成任務所依賴的行為] → 透過 Implementation Contract 的手動測試項目與 `login-gate` 既有 Scenario（`mavis`/`mavis123` 登入成功、錯誤帳密顯示錯誤訊息）交叉驗證，確保重構後行為不變。
