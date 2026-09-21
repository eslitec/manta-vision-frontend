## ADDED Requirements

### Requirement: 登入頁與註冊頁 SHALL 共用同一個表單元件

`LoginView.vue` 與 `RegisterView.vue` SHALL 各自掛載同一個共用元件 `AuthForm.vue`，並傳入對應的 `mode` prop（`login` 或 `register`），SHALL NOT 各自維護獨立的表單 template 與送出邏輯。

#### Scenario: LoginView 掛載 AuthForm

- **WHEN** 使用者訪問 `/login`
- **THEN** `LoginView.vue` SHALL 渲染 `AuthForm` 並傳入 `mode="login"`

#### Scenario: RegisterView 掛載 AuthForm

- **WHEN** 使用者訪問 `/register`
- **THEN** `RegisterView.vue` SHALL 渲染 `AuthForm` 並傳入 `mode="register"`

### Requirement: AuthForm SHALL 依 mode 切換文案、驗證規則與送出行為

`AuthForm.vue` SHALL 依 `mode` prop 決定標題／按鈕文案、密碼欄位 `autocomplete` 值、是否執行帳號密碼長度驗證、送出時呼叫的 session action、成功後的導頁行為，以及失敗時使用的錯誤碼判斷。

#### Scenario: mode 為 login 時的送出行為

- **WHEN** `AuthForm` 以 `mode="login"` 送出表單
- **THEN** 元件 SHALL 不執行帳號／密碼長度驗證，SHALL 呼叫 `session.login()`，成功後 SHALL 導向路由 query 的 `redirect` 參數（無則導向 `/`），失敗時 SHALL 用 `isInvalidCredentials()` 判斷錯誤碼並顯示對應訊息

##### Example: 登入失敗顯示帳密錯誤訊息

- **GIVEN** `AuthForm` 的 `mode` 為 `"login"`
- **WHEN** `session.login()` 拋出使 `isInvalidCredentials()` 回傳 `true` 的錯誤
- **THEN** 畫面顯示 `t('errors.invalidCredentials')`，且不導頁

#### Scenario: mode 為 register 時的送出行為

- **WHEN** `AuthForm` 以 `mode="register"` 送出表單
- **THEN** 元件 SHALL 先驗證帳號長度為 3 到 50 bytes、密碼長度為 8 到 72 bytes，驗證通過後 SHALL 呼叫 `session.register()`，成功後 SHALL 固定導向 `/`，失敗時 SHALL 用 `isUsernameTaken()` 判斷錯誤碼並顯示對應訊息

##### Example: 帳號長度不足時擋下送出

- **GIVEN** `AuthForm` 的 `mode` 為 `"register"`，使用者輸入的帳號 trim 後為 2 bytes
- **WHEN** 使用者送出表單
- **THEN** 元件 SHALL NOT 呼叫 `session.register()`，並顯示 `t('auth.usernameTooShort')`
