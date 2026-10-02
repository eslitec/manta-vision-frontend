## 1. 建立共用元件 AuthForm

- [x] 1.1 對齊 Requirement「AuthForm SHALL 依 mode 切換文案、驗證規則與送出行為」：新增 `src/components/AuthForm.vue`，接受 `mode: 'login' | 'register'` prop，依 mode 決定標題／按鈕 i18n key、密碼欄位 `autocomplete` 值、是否執行帳號密碼長度驗證、呼叫 `session.login()` 或 `session.register()`、成功後導頁行為（login 處理 `redirect` query，register 固定導 `/`）、以及失敗時用 `isInvalidCredentials()` 或 `isUsernameTaken()` 判斷錯誤碼。驗證：`npm run build` 型別檢查通過。
- [x] 1.2 把 `LoginView.vue` 現有 template 與 `submit()` 邏輯搬進 `AuthForm` 的 `mode="login"` 分支，行為與搬遷前一致（帳密輸入、送出後呼叫 `session.login()`、失敗顯示 `t('errors.invalidCredentials')` 或 `displayMessage()` 訊息）。驗證：`npm run dev` 手動測試 `/login` 輸入正確帳密可登入、輸入錯誤帳密顯示「帳號或密碼錯誤」訊息且不導頁。
- [x] 1.3 把 `RegisterView.vue` 現有 template、`validate()`、`submit()` 邏輯搬進 `AuthForm` 的 `mode="register"` 分支，保留帳號 3-50 bytes、密碼 8-72 bytes 的長度驗證與 `isUsernameTaken()` 判斷。驗證：`npm run dev` 手動測試 `/register` 輸入過短帳號／密碼會擋下送出並顯示對應錯誤文案，輸入已存在帳號送出後顯示「帳號已被使用」訊息。

## 2. 改造 LoginView 與 RegisterView 為薄殼頁面

- [x] 2.1 對齊 Requirement「登入頁與註冊頁 SHALL 共用同一個表單元件」：`LoginView.vue` 改為只掛載 `<AuthForm mode="login" />`，移除原本重複的 template 與 script 邏輯。驗證：`npm run build` 通過，且瀏覽器訪問 `/login` 呈現的欄位、文案、底部連結與改版前一致。
- [x] 2.2 對齊 Requirement「登入頁與註冊頁 SHALL 共用同一個表單元件」：`RegisterView.vue` 改為只掛載 `<AuthForm mode="register" />`，移除原本重複的 template 與 script 邏輯。驗證：`npm run build` 通過，且瀏覽器訪問 `/register` 呈現的欄位、文案、底部連結與改版前一致。

## 3. 回歸驗證

- [x] 3.1 執行 `npm run build`（`vue-tsc --noEmit` + `vite build`）與 `npm run lint`，確認本次重構未破壞既有型別檢查與 lint 規則。驗證：兩個指令皆以 exit code 0 結束。
- [x] 3.2 手動於瀏覽器依序測試四個案例並確認行為與重構前一致：（a）帶 `redirect` query 訪問 `/login` 並登入成功後導向該 redirect 路徑；（b）登入輸入錯誤帳密顯示錯誤訊息且不導頁；（c）註冊成功後導向 `/`；（d）註冊帳號已被使用時顯示對應錯誤訊息。驗證：四個案例畫面行為與 `git stash` 回到重構前版本比對一致。
