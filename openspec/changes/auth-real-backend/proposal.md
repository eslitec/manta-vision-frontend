## Why

`backend-api-client` 把路鋪好了（兩把鑰匙、統一錯誤格式、token 失效的接點），但
刻意沒有切換資料來源——`src/api/index.ts` 仍然指向 `mockApi`，所以那層基礎建設
在真實情境裡一次都沒被跑到。

同時另一條工作線已經把登入頁與註冊頁做完（`LoginView.vue`／`RegisterView.vue`／
`stores/session.ts`／路由守衛），它們打的還是假後端：`mock.ts` 裡寫死的
`mavis`／`mavis123`。

現在的狀態是「兩邊各自都好了，中間沒有接起來」。而後端 33 支端點裡只有 auth 三支
與 `GET /bots` 是真的實作，其餘都還是空殼——所以**不能整站一次切過去**，那會讓
每一頁同時變空白，出了問題也分不清是哪一層。

## What Changes

- 新增 `src/api/real.ts`：以 `{ ...mockApi, login, register, logout }` 的形式，
  只覆寫已經接得上的方法，其餘沿用假資料。後端每補完一支就加一個方法，不必
  一次全部切換。
- `src/api/index.ts` 依 `VITE_USE_MOCK` 決定用哪一份實作，預設仍是假資料。
- `Session` 型別補上 `token`／`botId`／`role`／`expiresAt`，`stores/session.ts`
  在收下 session 的同時把兩把鑰匙灌進 http 層，並在還原時檢查是否已過期。
- `src/utils/error.ts` 同時認得假後端的 `Error(CODE)` 與真後端的 `ApiError`，
  讓 view 不必因為換資料來源而改任何一行。
- 把 token 失效的處理從 `main.ts` 抽成 `src/api/sessionGuard.ts`，變成測得到的單元。
- 登入頁與註冊頁在「帳密錯誤／帳號被用走」以外的失敗也顯示訊息——原本是
  `throw e`，接上真後端之後那會變成按了按鈕完全沒反應。

**不做**：其餘 29 支端點的串接、token 續期、以及用 `GET /bots` 在啟動時驗證憑證
（見 design.md 的「已知缺口」）。

## Capabilities

### New Capabilities

- `auth-session`：登入／註冊／登出走真後端，以及登入狀態的生命週期——存放、
  還原、過期判定、失效時的收尾。

## Impact

- `src/api/real.ts`（新增）
- `src/api/real.spec.ts`（新增）
- `src/api/sessionGuard.ts`（新增）
- `src/api/sessionGuard.spec.ts`（新增）
- `src/test/factories.ts`（新增）
- `src/api/index.ts`
- `src/api/mock.ts`
- `src/api/mock.spec.ts`
- `src/env.d.ts`
- `src/main.ts`
- `src/router/router.spec.ts`
- `src/stores/session.ts`
- `src/stores/stores.spec.ts`
- `src/types/api.ts`
- `src/utils/error.ts`
- `src/views/LoginView.vue`
- `src/views/RegisterView.vue`
- `.env.example`

**不影響**：`src/api/http.ts`、`src/api/errors.ts`（`backend-api-client` 已完成，
這裡只是第一次真的用到它們）。後端一行都沒改。
