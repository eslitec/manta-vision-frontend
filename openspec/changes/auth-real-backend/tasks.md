## 1. 切換開關與型別

- [x] 1.1 對齊 Requirement「資料來源由環境變數切換且預設為假資料」：`src/api/index.ts` 依 `VITE_USE_MOCK === 'false'` 在 `realApi` 與 `mockApi` 之間選擇；`src/env.d.ts` 宣告用到的環境變數型別，打錯字不會靜靜地變成 `undefined`
- [x] 1.2 `.env.example` 補上 `VITE_USE_MOCK`，寫清楚「沒設定就是假資料」與為什麼預設保守
- [x] 1.3 `src/types/api.ts` 的 `Session` 補上 `token`／`botId`／`role`／`expiresAt` 四個欄位，每個都註明用途與為什麼存絕對時間
- [x] 1.4 `src/api/mock.ts` 抽出 `mockSession()`，讓假後端回傳的形狀與真後端一致（token／botId 給空字串——http 層看到空的就不送 header）

## 2. 真後端的 auth 實作

- [x] 2.1 對齊 Requirement「登入與註冊改由真後端驗證」：新增 `src/api/real.ts`，`login()` 打 `POST /auth/login`，把 `expiresIn`（秒）換算成 `expiresAt`（絕對毫秒）
- [x] 2.2 對齊 Requirement「註冊成功後直接進入已登入狀態」：`register()` 先打 `POST /auth/register`（回應不含 token），成功後以同一組帳密自動登入；註冊失敗時不發出登入請求
- [x] 2.3 `logout()` 打 `POST /auth/logout`，讓後端把該憑證列入黑名單
- [x] 2.4 `realApi` 以 `{ ...mockApi, login, register, logout }` 組成——後端尚未實作的 29 支端點沿用假資料，不會變成 `undefined`
- [x] 2.5 `src/api/real.spec.ts` 7 個測試：URL 與 payload、絕對時間換算、錯誤往上拋、註冊自動登入、註冊失敗不續打、登出、展開沒被拿掉

## 3. 登入狀態的生命週期

- [x] 3.1 對齊 Requirement「登入狀態存續於重新整理之後」：`stores/session.ts` 抽出 `adopt()`／`discard()`，收下 session 的同時把兩把鑰匙灌進 http 層；`restore()` 檢查 `expiresAt`，過期就丟掉、壞掉的 JSON 就清掉
- [x] 3.2 對齊 Requirement「登出同時清除前端狀態與後端憑證」：`logout()` 用 `try/finally`，後端打不通也要完成前端這一側的清除
- [x] 3.3 對齊 Requirement「憑證失效時把使用者送回登入頁」：把處理器從 `main.ts` 抽成 `src/api/sessionGuard.ts` 的 `installSessionGuard(session, router)`——`main.ts` 一 import 就會 `mount()`，寫在那裡等於測不到
- [x] 3.4 `src/api/sessionGuard.spec.ts` 5 個測試：`TOKEN_INVALID`／`TOKEN_EXPIRED` 會清狀態並導頁帶 redirect、`INVALID_CREDENTIALS` 不會、已在登入頁不再導一次、`NETWORK_ERROR` 不登出
- [x] 3.5 `src/stores/stores.spec.ts` 補 session store 的新行為（灌鑰匙、過期不還原、壞 JSON、後端打不通仍登出、`forceLogout` 不打 API），並新增 `src/test/factories.ts` 的 `fakeSession()` 收斂測試資料

## 4. 畫面的錯誤處理

- [x] 4.1 對齊 Requirement「登入與註冊的失敗一律要在畫面上說出來」：`src/utils/error.ts` 新增 `hasCode()`（同時認得假後端的 `Error(CODE)` 與真後端的 `ApiError.code`）與 `displayMessage()`（只有 `ApiError` 的訊息可以直接顯示，其餘用預設文案，避免把錯誤碼丟到畫面上）
- [x] 4.2 `LoginView.vue` 的 `showError: boolean` 改成 `errorMessage: string`，帳密錯誤以外的失敗（後端沒開、逾時、CORS 被擋）也顯示訊息，取代原本的 `throw e`
- [x] 4.3 `RegisterView.vue` 同樣處理，後端的欄位驗證訊息（例如密碼超過 72 bytes）直接顯示

## 5. 驗證

- [x] 5.1 `vue-tsc --noEmit` 零錯誤、`npm run lint` 零錯誤、Prettier 全數通過、`npm run build` 成功
- [x] 5.2 `npm test -- --run`：109 個測試全過（原 92 + 新 17）
- [x] 5.3 突變測試證明測試守得住：拿掉 `expiresAt` 換算 → 1 失敗；拿掉 `adopt()` 灌鑰匙與過期檢查 → 3 失敗；拿掉「已在登入頁不再導」 → 1 失敗
- [x] 5.4 **真的兩端一起跑起來**：容器內起 PostgreSQL 16 + Redis + uvicorn，前端以 `VITE_USE_MOCK=false` build 後 preview，用 Playwright 走完 13 項檢查——未登入被擋、註冊自動登入、localStorage 有真 JWT、重整存續、重複帳號、密碼錯誤、正確登入、過期不還原、登出後同一張 token 被後端拒絕（黑名單生效且 CORS 讓前端讀得到錯誤碼）
- [x] 5.5 後端關掉後重跑登入，確認畫面顯示「連不到伺服器，請確認後端已啟動或稍後再試。」而不是靜默失敗——這正是 4.2 要解決的情境
