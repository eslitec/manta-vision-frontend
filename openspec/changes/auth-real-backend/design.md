## Context

後端 33 支端點裡只有 4 支是真的：`POST /auth/register`、`POST /auth/login`、
`POST /auth/logout`、`GET /bots`。其餘 29 支（圖庫、飼料、品牌、行銷、指標、
修圖、影片）都還是空殼。

前端則是完整的：34 個 API 方法全部有假實作，每一頁都能跑。

所以這個 change 的核心限制是：**要在「只有 4 支真的」的前提下，讓登入變成真的，
而且其他頁面不能壞。**

## Goals / Non-Goals

Goals：

- 登入、註冊、登出走真後端，而且可以在瀏覽器裡真的驗證過
- 讓 `backend-api-client` 鋪的那層基礎建設第一次被真實流量跑到
- 建立「後端每補一支、前端就接一支」的漸進路徑

Non-Goals：

- 其餘 29 支端點的串接
- token 續期（後端沒有 refresh token，效期 7 天到了就要重新登入）
- 啟動時向後端驗證憑證（見下方「已知缺口」）

## Decisions

### 用展開而不是分支

```ts
export const realApi = { ...mockApi, login, register, logout }
```

替代方案是在每個方法裡寫 `if (useReal) ... else ...`，或是讓 `realApi` 只實作
四支、其餘丟 `NotImplemented`。

選展開的理由：

- 切過去之後**其他頁面完全不變**。丟 `NotImplemented` 會讓整站在同一天變空白，
  出了問題分不清是「後端沒寫」還是「前端接錯」。
- 後端補完一支，前端只要在這個檔案加一個同名方法，展開就自動被蓋掉。加減一支
  是一個函式的距離，不需要動開關、不需要動呼叫端。
- 型別自動對齊：新方法的簽章必須跟 `mockApi` 的同名方法相容，否則 `tsc` 會擋下來。

代價是「哪些是真的」不會寫在型別上，只寫在這個檔案的註解裡。`real.spec.ts` 的
最後一個測試釘住這個展開，避免有人「整理」時把它拿掉。

### `expiresAt` 存絕對時間，不存 `expiresIn`

後端回的是剩餘秒數（604800）。如果原樣存進 localStorage，重新整理之後就無從得知
「還剩多久」——存下去的那一刻起它就在說謊。換算成絕對毫秒之後，`restore()` 才
判斷得出來這張憑證還能不能用。

### `VITE_USE_MOCK` 預設為假資料

讀起來有點繞（`USE_MOCK=false` 才是打真後端），但方向是刻意的：**忘了設定會看到
假資料，而不是整站連不上**。前者幾秒內就會發現，後者要查很久，而且症狀
（每支 API 都失敗）跟「後端掛了」一模一樣。

### `SESSION_INVALID_CODES` 不含 `INVALID_CREDENTIALS`

三個碼都是 401，但意思不同：前兩個是「你這張票不能用了」，第三個是「你這次密碼
打錯了」。混在一起的話，打錯一次密碼就會觸發「清 session → 導向登入頁」，而使用者
本來就在登入頁——結果是畫面一直閃，錯誤訊息還沒看到就被洗掉。

這件事在 `errors.ts` 與 `sessionGuard.spec.ts` 各釘了一個測試。

### 把處理器抽成 `sessionGuard.ts`

原本寫在 `main.ts` 的 `setSessionExpiredHandler(...)` 裡。問題是 `main.ts` 一被
import 就會 `createApp().mount('#app')`，在 Node 測試環境跑不起來——等於這段
「憑證失效要怎麼辦」的邏輯完全沒有測試。抽成一個吃 `(session, router)` 的函式
之後，用 `createMemoryHistory` 的 router 加一個 `{ forceLogout: vi.fn() }`
就能把整條線走完。

`session` 的型別刻意寫成只有 `forceLogout` 的最小介面，測試就不必造一整個
pinia store。

### 登入頁的 `throw e` 改成顯示訊息

原本兩個 view 都是「認得的錯誤就顯示，其他 `throw e`」。走假後端時這沒問題——
假後端只會丟那兩個碼。接上真後端之後，最常見的失敗變成「後端沒開」，而那條路徑
是 `throw e`：**按了登入完全沒反應**，console 裡有一個沒人會看的 unhandled
rejection。

`displayMessage()` 只讓 `ApiError` 的訊息直接顯示（後端的訊息本來就是寫給人看的
中文），其他來源一律用預設文案——假後端丟的是 `new Error('INVALID_CREDENTIALS')`，
它的 `message` 是錯誤碼本身，不能出現在畫面上。

## Risks / Trade-offs

**風險：`role` 目前沒有任何地方在用。** 後端會回，前端存下來但沒有依它分流。
留著是因為它是登入回應的一部分，之後做權限時會需要；現在拿掉，那天要改的是
型別、store、兩個測試檔。

**風險：假資料與真後端的形狀不一致，切換時才會發現。** 這個 change 只對 auth
三支對齊過。其餘 29 支的差異還沒有人比對過——這正是「契約差異報告」要做的事，
且**應該在後端動工前完成**：後端還沒寫的東西，現在改契約成本是零。

## 已知缺口

**啟動時不會向後端驗證憑證。** `restore()` 只檢查 `expiresAt` 這個前端自己算的
時間。如果憑證是被登出黑名單作廢、或後端換過 `JWT_SECRET`，前端仍然會顯示為
已登入，直到下一支真的 API 回 401 才會被踢出去。

而目前**沒有任何一支真的 API 會被呼叫**（其他頁面都吃假資料），所以那個「踢出去」
的機制在瀏覽器裡一次都不會觸發——端對端測試裡刻意沒有假裝測到它，改由
`sessionGuard.spec.ts` 在單元層守著，並已用 curl 對真後端確認過「竄改過的 token」
與「登出後的 token」回的都是 `TOKEN_INVALID`（在 `SESSION_INVALID_CODES` 裡）。

補法：啟動時打一次 `GET /bots`（唯一另一支實作好的端點，而且之後本來就需要它
來拿機器人清單）。沒放進這個 change，是因為它會讓 `realApi` 多出一個 `mockApi`
沒有的方法，型別上要另外處理——留給串接 `GET /bots` 的那個 change 一起做比較乾淨。
