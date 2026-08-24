## 1. 前端 HTTP 客戶端

- [x] 1.1 對齊 Requirement「請求帶上身分與機器人標頭」：重寫 `src/api/http.ts` 的請求攔截器——`Authorization: Bearer` 與 `X-Bot-Id` 改由 `setAuth()`／`clearAuth()` 管理，值為空就不送該 header（舊版寫死 `bot_rihan` 且無條件送出）。驗證：假 adapter 攔下 config 檢查 header 有無
- [x] 1.2 對齊 Requirement「後端錯誤翻成統一的前端錯誤型別」：新增 `src/api/errors.ts`，鏡像後端 `app/errors.py` 的碼表，定義 `ApiError`（帶 `code`／`status`／`fieldErrors`／`requestId`）與 `isApiError`／`hasErrorCode`／`fieldErrorsOf` 工具。驗證：後端照契約回的錯誤四個欄位都保留
- [x] 1.3 對齊 Requirement「連不到伺服器與逾時各有自己的錯誤碼」：回應攔截器處理沒有 response 的情況，逾時給 `TIMEOUT`、其餘給 `NETWORK_ERROR`；有回應但不是統一格式時依狀態碼給可分流的碼。驗證：三種情境各一個測試
- [x] 1.4 對齊 Requirement「token 失效時通知應用層而不自行導頁」：以 `setSessionExpiredHandler()` 讓應用層註冊 callback，http 層不 import router／store。`INVALID_CREDENTIALS` 明確排除在外。驗證：`TOKEN_EXPIRED` 會呼叫 callback、`INVALID_CREDENTIALS` 不會
- [x] 1.5 新增 `.env.example`，說明 `VITE_API_BASE` 的用途與它跟後端 `CORS_ORIGINS` 的關係

## 2. 後端 CORS

- [x] 2.1 對齊 Requirement「後端允許前端來源跨網域存取」：`app/main.py` 掛上 `CORSMiddleware`，允許來源讀 `settings.cors_origins`（不在 main.py 直接讀環境變數，否則違反架構守則「設定沒經過 config.py」）
- [x] 2.2 `app/config.py` 新增 `cors_origins` 設定與 `_csv()` 解析器，預設為前端 dev server 的兩個位址；`.env.example` 補上 `CORS_ORIGINS` 與正式環境的說明
- [x] 2.3 `tests/test_cors.py` 補 5 個測試：dev origin 通過 preflight、兩把鑰匙的 header 在允許清單裡、**錯誤回應也要帶 Allow-Origin**（否則前端讀不到錯誤碼，只會看到空的 network error）、未列入的來源不放行、不開 credentials

## 3. 驗證

- [x] 3.1 後端：`pytest` 71 個測試全過（原 66 + 新 5）、`pylint app/ --fail-under=8.0 --fail-on=E` 9.46/10 通過、`scripts/check-arch.sh` 通過
- [x] 3.2 後端：把 CORS middleware 拿掉後重跑，確認 3 個正向測試真的會失敗——證明測試守得住這件事，不是恆真
- [x] 3.3 前端：`npm run build`、`npm test -- --run` 78 個測試全過（原 68 + 新 10）、`npm run lint` 零錯誤、Prettier 格式化
- [x] 3.4 兩端一起跑起來實測一次：起 PostgreSQL 16 + Redis + uvicorn，前端以真後端位址 build 後用瀏覽器實際操作——preflight 通過、`Authorization` 與 `X-Bot-Id` 真的送出、401 回的是後端的統一格式（`{code:'TOKEN_INVALID',...}`）且錯誤回應同樣帶 `Allow-Origin`，前端讀得到錯誤碼。詳見 `auth-real-backend` 的 5.4
