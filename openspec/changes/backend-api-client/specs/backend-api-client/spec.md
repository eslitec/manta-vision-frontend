## Purpose

定義前端與真後端之間那一層 HTTP 客戶端的行為：每個請求要帶什麼身分資訊、後端的
統一錯誤格式如何翻成前端能分流的型別、以及 token 失效時由誰決定要把使用者送去哪。

這一層不決定資料從 mock 還是真後端來（那是 `src/api/index.ts` 的事），只保證
「一旦打真後端，行為是可預期的」。

## ADDED Requirements

### Requirement: 請求帶上身分與機器人標頭

HTTP 客戶端 SHALL 在每個請求帶上 `Authorization: Bearer <token>` 與 `X-Bot-Id`，
兩者的值由呼叫端透過設定函式提供；值為空時 SHALL NOT 送出該標頭。

#### Scenario: 尚未登入

- **WHEN** 沒有設定過 token 與 botId 就發出請求
- **THEN** 請求不帶 `Authorization`，也不帶 `X-Bot-Id`

#### Scenario: 登入後

- **WHEN** 呼叫端設定了 token 與 botId 之後發出請求
- **THEN** 請求同時帶上 `Authorization: Bearer <token>` 與 `X-Bot-Id: <botId>`

#### Scenario: 只更新其中一項

- **WHEN** 呼叫端只更新 botId
- **THEN** 既有的 token 保持不變

### Requirement: 後端錯誤翻成統一的前端錯誤型別

當後端回傳 `{code, message, fieldErrors, requestId}` 形狀的錯誤時，HTTP 客戶端
SHALL 把它翻成單一的錯誤型別，保留四個欄位與 HTTP 狀態碼，讓呼叫端以 `code` 分流
而非比對訊息字串。

#### Scenario: 後端回傳含欄位錯誤的驗證失敗

- **WHEN** 後端以 400 回傳 `code`、`message`、`fieldErrors` 與 `requestId`
- **THEN** 呼叫端收到的錯誤保留這四項與狀態碼 400
- **AND** 查詢沒有錯誤的欄位時得到空陣列

### Requirement: 連不到伺服器與逾時各有自己的錯誤碼

當請求沒有得到回應，HTTP 客戶端 SHALL 依原因給出可分流的錯誤碼：逾時與連線失敗
不得共用同一個碼。當有回應但內容不是後端的統一格式時，SHALL 依 HTTP 狀態碼給出
可分流的碼。

#### Scenario: 後端沒有啟動

- **WHEN** 請求完全沒有得到回應
- **THEN** 錯誤碼為連線失敗，且狀態碼為 0

#### Scenario: 請求逾時

- **WHEN** 請求超過逾時設定
- **THEN** 錯誤碼為逾時

#### Scenario: 中間層回傳非預期內容

- **WHEN** 收到 502 且內容不是統一錯誤格式
- **THEN** 錯誤碼依狀態碼歸類為伺服器錯誤，並保留狀態碼 502

### Requirement: token 失效時通知應用層而不自行導頁

當後端回報 token 過期或無效時，HTTP 客戶端 SHALL 通知應用層註冊的處理器，並且
SHALL NOT 自行操作路由或 session。憑證錯誤（登入時帳號密碼不符）SHALL NOT 觸發
這個通知。

#### Scenario: token 過期

- **WHEN** 後端以 401 回傳 token 過期的錯誤碼
- **THEN** 應用層註冊的處理器被呼叫一次，並收到該錯誤

#### Scenario: 登入時密碼錯誤

- **WHEN** 後端以 401 回傳憑證錯誤的碼
- **THEN** 應用層的處理器不被呼叫
- **AND** 呼叫端仍收到憑證錯誤的碼，可留在登入頁顯示訊息

### Requirement: 後端允許前端來源跨網域存取

後端 SHALL 對設定檔列出的來源回應 CORS 標頭，涵蓋 preflight 與實際請求；允許的
自訂標頭 SHALL 包含身分與機器人這兩個標頭。未列入的來源 SHALL NOT 取得放行標頭。

#### Scenario: 前端 dev server 發出 preflight

- **WHEN** 來源為設定檔列出的前端位址
- **THEN** preflight 回應放行該來源，且允許的標頭包含身分與機器人標頭

#### Scenario: 後端回傳錯誤

- **WHEN** 前端來源發出的請求得到 4xx 回應
- **THEN** 該錯誤回應同樣帶上放行標頭，前端才讀得到後端的錯誤碼

#### Scenario: 未列入的來源

- **WHEN** 來源不在設定檔的清單中
- **THEN** 回應不帶該來源的放行標頭
