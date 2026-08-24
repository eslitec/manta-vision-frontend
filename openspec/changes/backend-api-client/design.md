## Context

後端只實作了 4 支端點（`POST /auth/register`、`POST /auth/login`、`POST /auth/logout`、
`GET /bots`），其餘 29 支都還是空殼。這個 change 因此刻意只做基礎建設，不接任何
實際端點——接了也只有 auth 能接，而 auth 正由 `login-gate` 那條工作線在做。

## Decisions

- **`http.ts` 不認識 router、store 或畫面。** token 失效要做什麼（清 session、
  導回登入）是應用層的決定。做法是開一個 `setSessionExpiredHandler()` 讓應用層
  註冊 callback，而不是在 http 層 import router——反向依賴會讓這個檔案沒辦法
  單獨載入與測試，也會跟 login-gate 的檔案綁死。
- **`INVALID_CREDENTIALS` 不算 session 失效。** 它跟 `TOKEN_EXPIRED`／`TOKEN_INVALID`
  一樣是 401，但意思是「這次登入打錯密碼」，要留在登入頁顯示訊息。混進去會讓
  打錯密碼變成無限重導——這是這一層最容易寫錯的地方，所以獨立成
  `SESSION_INVALID_CODES` 並在測試裡鎖住。
- **值沒設定就不送 header。** 舊版寫死 `ctx.botId = 'bot_rihan'` 並無條件送出；
  後端收到不合法的 `X-Bot-Id` 會回 `BOT_ID_REQUIRED`，反而比不送更難查。
- **錯誤一律翻成 `ApiError` 再往外丟。** 呼叫端不需要認識 axios，也不必自己判斷
  `error.response?.data?.code` 這種三層可選鏈。三種來源各自有碼：後端照契約回的
  用它自己的碼；連不到／逾時用 `NETWORK_ERROR`／`TIMEOUT`；有回應但不是那個格式
  （反向代理吐的 HTML 502）依狀態碼給一個能分流的碼。
- **前端碼表是後端 `app/errors.py` 的鏡像，但型別留了 `string & {}` 的逃生口。**
  後端先上了新碼、前端還沒同步時不該讓 TypeScript 爆掉，只是失去自動完成。
- **CORS 的允許來源走 `config.py`。** 後端 CLAUDE.md 的架構守則之一是「設定沒經過
  `config.py`」會被 `scripts/check-arch.sh` 擋下，所以 `main.py` 不直接讀環境變數。
- **CORS 不開 `allow_credentials`。** token 走 Authorization header、不放 cookie，
  用不到；關著也讓「萬一有人把 allow_origins 放寬成萬用字元」不會直接變成漏洞。
- **`allow_headers` 逐項列出而非 `"*"`。** 這四個（Authorization、Content-Type、
  X-Bot-Id、Idempotency-Key）就是 `docs/api.md` 目前定義的全部，寫出來等於把契約
  放在看得到的地方，要多一個就得有人有意識地加。

## Risks / Trade-offs

- **`src/utils/error.ts` 目前還認 `e.message === 'INSUFFICIENT_FEED'`**，那是 mock
  擲 `new Error(code)` 的形狀。真後端的 `ApiError` 把碼放在 `code`、把人看的訊息放在
  `message`，兩者對不上。這次刻意不動那個檔案（它正由 login-gate 那條線在改），
  等切換 `api/index.ts` 時一併處理——切換前這條路徑不會被執行到。
- **沒有端到端測試。** 後端只有 4 支端點可打，真正的 e2e 要等資料來源切換過去。
  這一層的測試用假 adapter 驗攔截器鏈，涵蓋 header、三種錯誤來源與通知時機。
