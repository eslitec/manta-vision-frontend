## Why

前端所有資料都還走 `src/api/mock.ts`（記憶體假後端）。真後端 `manta-vision-backend`
已經可以連了，但兩邊之間缺一層能用的 HTTP 客戶端：

- `src/api/http.ts` 是佔位版本——`ctx.botId` 寫死 `'bot_rihan'`、回應攔截器只有一行
  `TODO: 統一錯誤提示／401 導向登入`，錯誤原封不動往外丟。
- 後端所有 4xx/5xx 都回統一格式 `{code, message, fieldErrors, requestId}`（後端
  `docs/api.md` §3），前端沒有任何型別或工具認得它。
- 後端**完全沒有 CORS 設定**。瀏覽器從 Vite dev server（:5173）打過去會在
  preflight 就被擋掉——症狀是 curl 打得通、Swagger 也正常，只有畫面整片失敗。

這個 change 只鋪路，**不切換資料來源**：`src/api/index.ts` 仍然指向 mock。

## What Changes

- 重寫 `src/api/http.ts`：兩把鑰匙（`Authorization: Bearer` 與 `X-Bot-Id`）由
  `setAuth()`／`clearAuth()` 灌入，值沒設定就不送該 header；回應攔截器把後端的
  統一錯誤格式翻成 `ApiError`。
- 新增 `src/api/errors.ts`：後端錯誤碼的前端鏡像、`ApiError` 型別與判讀工具。
- 後端補上 CORS middleware，允許來源由 `CORS_ORIGINS` 環境變數控制。
- 兩邊各補 `.env.example`，讓「前端要打哪裡、後端要放行誰」寫在看得到的地方。

## Capabilities

### New Capabilities

- `backend-api-client`：前端對真後端的 HTTP 客戶端——身分標頭、統一錯誤格式的
  翻譯、以及 token 失效時通知應用層的接點。

## Impact

- `src/api/http.ts`
- `src/api/errors.ts`（新增）
- `src/api/http.spec.ts`（新增）
- `.env.example`（新增）
- 後端 `manta-vision-backend`：`app/main.py`、`app/config.py`、`.env.example`、`tests/test_cors.py`（新增）

**不影響**：`src/api/index.ts` 仍指向 `mockApi`，畫面行為完全不變。
`src/utils/error.ts` 與 login-gate 相關檔案一律不碰（由另一條工作線負責）。
