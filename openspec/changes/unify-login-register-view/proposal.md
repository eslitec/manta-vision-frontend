## Summary

把 `LoginView.vue` 與 `RegisterView.vue` 兩個幾乎重複的表單元件，整合成一個依 mode 切換文案與行為的共用元件，消除重複程式碼。

## Motivation

PR code review（nelsonliu-eslitec）指出登入頁與註冊頁應該可以整合在一起。目前兩個檔案（`src/views/LoginView.vue`、`src/views/RegisterView.vue`）的 template 結構、樣式類別命名模式、送出流程幾乎一致，差異只在：

- 標題文案（`auth.title` vs `auth.registerTitle`）與送出按鈕文案（`auth.submit` vs `auth.registerSubmit`）
- 密碼欄位 `autocomplete` 值（`current-password` vs `new-password`）
- 註冊頁多一段前端欄位驗證（帳號 3-50 bytes、密碼 8-72 bytes），登入頁沒有
- 送出後呼叫的 store action 不同（`session.login` vs `session.register`）與導頁邏輯（登入要處理 `redirect` query，註冊固定導回 `/`）
- 失敗時的錯誤碼判斷不同（`isInvalidCredentials` vs `isUsernameTaken`）
- 頁尾連結文案與目標路由互為反向（`auth.noAccountPrompt` + 連到 `/register` vs `auth.hasAccountPrompt` + 連到 `/login`）

維持兩份幾乎相同的檔案，日後任何一邊調整樣式或欄位規則都要記得同步改另一邊，容易遺漏。

## Proposed Solution

新增一個共用元件（暫定 `src/components/AuthForm.vue`），接受 `mode: 'login' | 'register'` prop，內部依 mode 決定：

- 顯示的 i18n 文案 key（標題、按鈕文案、頁尾提示與連結文案）
- 密碼欄位的 `autocomplete` 屬性
- 是否執行註冊專用的欄位驗證（帳號／密碼長度）
- 送出時呼叫 `session.login` 或 `session.register`
- 成功後的導頁行為（login 需要處理 `redirect` query；register 固定導回 `/`）
- 失敗時使用哪個 `isXxx()` 錯誤碼判斷（沿用 `@/utils/error` 既有的 `isInvalidCredentials`／`isUsernameTaken`）

`LoginView.vue` 與 `RegisterView.vue` 保留為極薄的路由頁面殼，各自掛載 `<AuthForm mode="login" />` 或 `<AuthForm mode="register" />`，維持 `/login`、`/register` 兩條路由各自可直接進入、互相提供連結的既有行為不變。

行為（驗證規則、錯誤訊息、導頁邏輯）與現況完全一致，純粹是把重複的 template／script 邏輯收斂到一個共用元件，不改變任何使用者可觀察到的行為，因此不修改既有的 login-gate／account-registration capability 規格。

## Non-Goals

- 不改變登入／註冊的驗證規則、錯誤訊息文案、或導頁行為
- 不合併成單一路由（`/login`、`/register` 仍是兩個獨立路徑）
- 不處理 auth-session（真後端串接）範圍內的任何項目，那是既有 auth-real-backend change 的範圍
- 不新增「同一頁面切換登入/註冊模式」的 UI 互動（例如 tab 切換），僅共用元件實作，路由與頁面入口不變

## Capabilities

### New Capabilities

- `auth-form-shared-component`: 定義登入頁與註冊頁共用同一個表單元件（`AuthForm.vue`）的架構慣例，依 `mode` prop 切換文案、驗證規則與送出行為，`LoginView.vue`／`RegisterView.vue` 各自掛載對應 mode。

### Modified Capabilities

（無 — 既有 login-gate／account-registration 的使用者可觀察行為不變）

## Impact

- Affected code:
  - New: src/components/AuthForm.vue
  - Modified: src/views/LoginView.vue, src/views/RegisterView.vue
