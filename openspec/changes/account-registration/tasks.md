## 1. Mock API 與型別

- [x] 1.1 對齊設計決策「Mock 使用者清單改為可擴充的帳號集合」：`src/types/api.ts` 新增 `RegisterReq` 型別；`src/api/mock.ts` 的 `db` 新增 `users: Map<string, { password: string; displayName: string }>`（初始含 demo 帳號 `mavis`），`login()` 改為查 `db.users` 而非寫死比對 `DEMO_USERNAME`/`DEMO_PASSWORD`。驗證：`npm run dev` 後於 `/login` 用既有 demo 帳密 `mavis`/`mavis123` 登入仍然成功。
- [x] 1.2 對齊設計決策「Mock 使用者清單改為可擴充的帳號集合」與 Requirement「註冊帳號重複時顯示錯誤」：`mock.ts` 新增 `register(username, password)`，帳號已存在於 `db.users` 時丟 `USERNAME_TAKEN`，否則寫入 `db.users`（`displayName` 等於 `username`）並建立 `db.session`、回傳 `Session`。驗證：手動呼叫（或透過畫面）用已存在帳號 `mavis` 註冊會得到 `USERNAME_TAKEN` 錯誤，且 `db.users` 大小不變。
- [x] 1.3 `src/utils/error.ts` 新增 `USERNAME_TAKEN` 常數與 `isUsernameTaken(e: unknown): boolean` helper，寫法比照既有 `isInvalidCredentials`。驗證：`npm run build` 型別檢查通過。

## 2. Session Store

- [x] 2.1 對齊設計決策「註冊即自動登入，複用 session store 既有機制」：`src/stores/session.ts` 的 `useSessionStore` 新增 `register(username: string, password: string): Promise<void>` action，呼叫 `api.register`、設定 `session.value`、寫入 `localStorage`（`STORAGE_KEY`），行為對稱於既有 `login()`。驗證：於瀏覽器 devtools 呼叫後 `session.isAuthenticated` 為 `true`，`localStorage` 出現對應 key。

## 3. 路由

- [x] 3.1 對齊 Requirement「登入頁提供前往註冊頁的連結」與「註冊頁提供返回登入頁的連結」：`src/router/routes.ts` 新增 `{ path: '/register', name: 'register', meta: { public: true, titleKey: 'routeTitles.register' }, component: () => import('@/views/RegisterView.vue') }`。驗證：瀏覽器直接訪問 `/register`（未登入狀態）不會被路由守衛導去 `/login`。

## 4. 多語系文案

- [x] 4.1 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts` 新增註冊頁與錯誤訊息文案：`routeTitles.register`、`auth.registerTitle`、`auth.registerSubmit`、`auth.usernameTooShort`、`auth.usernameTooLong`、`auth.passwordTooShort`、`auth.passwordTooLong`、`auth.hasAccountPrompt`、`auth.goToLogin`、`auth.noAccountPrompt`、`auth.goToRegister`、`errors.usernameTaken`，兩邊 key 結構一致。驗證：兩個檔案的新增 key 逐一比對，結構完全一致（無單邊缺漏）。

## 5. 共用視覺樣式

- [x] 5.1 對齊設計決策「登入頁與註冊頁共用視覺樣式，抽成 SCSS mixin」：`src/assets/scss/_mixins.scss` 新增 `@mixin authCard`，內容涵蓋現有 `.loginView` 的背景圖置中、懸浮卡片（不透明白底、圓角、陰影）、logo 尺寸、欄位 label／input／error 樣式、submit 按鈕寬度、卡片下方連結列樣式。驗證：`npm run build` 的 SCSS 編譯階段無語法錯誤。
- [x] 5.2 `LoginView.vue` 的 `.loginView` 樣式改為 `@include authCard`，卡片下方新增「還沒有帳號？註冊」連結列（點擊導向 `/register`）。驗證：瀏覽器開啟 `/login`，桌面寬度下視覺與 `login-visual-refresh` 完成時一致，卡片下方新增可點擊的「還沒有帳號？註冊」連結。

## 6. 註冊頁

- [x] 6.1 對齊 Requirement「提供帳號密碼註冊表單」與設計決策「帳號／密碼欄位驗證規則」：新增 `src/views/RegisterView.vue`，欄位為帳號／密碼，`.registerView` 套用 `@include authCard`，`submit()` 送出前用 `TextEncoder().encode(str).length` 檢查 byte 長度（帳號 3–50、密碼 8–72），不符合時顯示對應錯誤訊息且不呼叫 `session.register`。驗證：帳號輸入 `ab` 送出，畫面顯示帳號過短錯誤；開啟瀏覽器 Network 面板確認沒有對應的 API 呼叫。
- [x] 6.2 對齊 Requirement「註冊帳號重複時顯示錯誤」：`RegisterView.vue` 呼叫 `session.register` 失敗且 `isUsernameTaken(e)` 為真時，顯示「此帳號已被使用，請換一個帳號。」，畫面停留在 `/register`。驗證：用帳號 `mavis`、密碼 `anypass123` 送出，畫面顯示該錯誤訊息，網址仍是 `/register`。
- [x] 6.3 對齊 Requirement「註冊成功後自動登入並導向首頁」與設計決策「註冊即自動登入，複用 session store 既有機制」：`RegisterView.vue` 註冊成功後呼叫 `router.push('/')`；卡片下方新增「已經有帳號？登入」連結（點擊導向 `/login`）。驗證：用帳號 `newuser001`、密碼 `password123`（皆未使用過）送出，成功導向首頁，topbar 顯示使用者名稱 `newuser001`；登出後用同一組帳密登入成功。

## 7. 整體驗證

- [x] 7.1 執行 `npm run build`（`vue-tsc --noEmit` 型別檢查 + vite build）。驗證：指令執行完成且結束代碼為 0，終端機輸出無型別錯誤。
- [x] 7.2 執行 `npm run lint`。驗證：指令執行完成且結束代碼為 0，終端機輸出無 ESLint 錯誤。
- [x] 7.3 手動驗證 `login-gate` 既有登入行為在 `login()` 改查 `db.users` 之後不受影響：於 `/login` 輸入 `mavis`／`mavis123` 應登入成功；輸入 `mavis`／錯誤密碼應顯示「帳號或密碼錯誤，請再試一次。」且停留在登入頁。驗證：手動操作瀏覽器確認兩種情境結果與 `login-visual-refresh` 完成時一致。
