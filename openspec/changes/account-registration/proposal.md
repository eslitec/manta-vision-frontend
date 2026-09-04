## Why

目前 `login-gate` 只有一組寫死的 demo 帳密（`mavis` / `mavis123`），沒有任何方式讓新使用者建立自己的帳號。需要一個註冊頁，讓使用者自行建立帳號密碼並登入系統。

## What Changes

- 新增獨立的 `/register` 全頁路由（`meta: { public: true }`，不套用 `DefaultLayout`），提供帳號／密碼註冊表單。
- 註冊表單只有兩個欄位：帳號（`username`，3–50 bytes）與密碼（`password`，8–72 bytes），沒有確認密碼欄位、沒有顯示名稱欄位。
- Mock API 新增註冊端點：檢查帳號是否已存在於 mock 使用者清單，已存在則回傳錯誤；不存在則建立新帳號（`displayName` 預設等於 `username`），並回傳可用的 session。
- 註冊成功後前端自動建立登入狀態（沿用 `login-gate` 既有的 session 持久化機制）並導向首頁；帳號重複時顯示錯誤訊息，畫面停留在註冊頁。
- 登入頁卡片下方新增「還沒有帳號？註冊」連結導向 `/register`；註冊頁卡片下方新增「已經有帳號？登入」連結導回 `/login`。
- 視覺沿用 `login-visual-refresh` 剛完成的外殼（全螢幕背景圖、懸浮不透明白色卡片、MantaGO logo），只是欄位與按鈕文案不同。

## Capabilities

### New Capabilities

- `account-registration`：帳號註冊功能——提供 `/register` 註冊頁、mock 註冊 API（含帳號重複檢查）、註冊成功後自動登入並導向首頁、註冊失敗顯示錯誤訊息。

### Modified Capabilities

- `login-gate`：登入頁新增「前往註冊頁」的連結；不改動既有的帳密驗證、路由守衛、登入狀態持久化、登出等 Requirement。

## Impact

- Affected specs: `account-registration`（新增）、`login-gate`（新增連結相關 Requirement）
- Affected code:
  - New: `src/views/RegisterView.vue`
  - Modified: `src/views/LoginView.vue`（卡片下方新增前往註冊頁的連結）
  - Modified: `src/api/mock.ts`（新增 register 端點與 mock 使用者清單，帳號重複檢查邏輯）
  - Modified: `src/types/api.ts`（新增 `RegisterReq` 型別）
  - Modified: `src/utils/error.ts`（新增 `USERNAME_TAKEN` 錯誤碼與判斷 helper）
  - Modified: `src/router/routes.ts`（新增獨立的 `/register` 路由）
  - Modified: `src/stores/session.ts`（新增 `register()` action，呼叫 mock API 並建立登入狀態）
  - Modified: `src/lang/zh-Hant.ts`、`src/lang/en.ts`（新增註冊頁與錯誤訊息文案，兩邊 key 結構一致）
