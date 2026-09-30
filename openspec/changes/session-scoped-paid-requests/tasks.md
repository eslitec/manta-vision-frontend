## 1. 登出清理

- [x] 1.1 對齊 Requirement「登出清除帳號範圍的快取」與設計決策「清理集中在 session.discard，各自以 epoch 丟棄晚到回應」：`src/stores/feed.ts` 新增 `reset()` 與 epoch 防護、`src/composables/useAssets.ts` 新增 `resetFolders()` 與 epoch 防護、`src/stores/session.ts` 的 `discard()` 呼叫兩者；驗證：`npx vitest run src/stores/stores.spec.ts` 的「登出清掉帳號範圍的快取」兩條綠燈，拿掉 `discard()` 的呼叫或任一 epoch 判斷時轉紅。
- [x] 1.2 對齊 Requirement「影片建立的晚到回應不得建立任務」：`src/stores/generationTasks.ts` 的 `createVideoTask` 送出前記 epoch、回來時不符丟 `SESSION_CHANGED`；驗證：store 測試「createVideoTask 回來前已登出」綠燈，拿掉判斷時轉紅。

## 2. 付費管線

- [x] 2.1 對齊 Requirement「付費請求綁定送出當下的登入身分」與設計決策「付費流程以「token＋botId」當身分，而不是 session epoch」：`src/api/real.ts` 的 `postPaid`／`pollGeneration` 送出前 `assertSameIdentity`，新增 `resetPaidRequests()` 並由 `discard()` 呼叫；`src/api/errors.ts` 新增 `SESSION_CHANGED`，兩語系新增 `errors.sessionChanged`；驗證：`npx vitest run src/api/real.spec.ts` 的三條身分測試綠燈，拿掉 `assertSameIdentity` 或 `openKeys.clear()` 時轉紅。
- [x] 2.2 對齊 Requirement「202 受理後保留冪等鍵直到輪詢定案」與設計決策「202 保留 key 由旗標決定，定案才丟」：`postPaid` 新增 `pendingOn202`，`runGeneration` 在 `done`／`GENERATION_FAILED` 才刪 key，註解標明後端 900 秒上限；驗證：`real.spec.ts` 的「404 後沿用同一把 key」「超過上限後沿用同一把 key」「done／failed 後是新的 key」綠燈，202 改回一律刪 key 時前兩條轉紅；既有圖生影測試不變。

## 3. 收尾

- [x] 3.1 對齊 Requirement「登出清除帳號範圍的快取」：`npx vitest run` 全綠（317）、`npx vue-tsc --noEmit` exit 0、`npm run lint` exit 0、`npx prettier --check` 改動檔全過、i18n 兩語系 key 差異不變。
