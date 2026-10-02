## 1. 登出清理

- [x] 1.1 對齊 Requirement「登出清除帳號範圍的快取」與設計決策「清理集中在 session.discard，各自以 epoch 丟棄晚到回應」：`src/stores/feed.ts` 新增 `$reset()` 與 epoch 防護、`src/composables/useAssets.ts` 新增 `resetFolders()` 與 epoch 防護、`src/stores/session.ts` 的 `discard()` 呼叫兩者；驗證：`npx vitest run src/stores/stores.spec.ts` 的「登出清掉帳號範圍的快取」兩條綠燈，拿掉 `discard()` 的呼叫或任一 epoch 判斷時轉紅。
- [x] 1.2 對齊 Requirement「影片建立的晚到回應不得建立任務」：`src/stores/generationTasks.ts` 的 `createVideoTask` 送出前記 epoch、回來時不符丟 `SESSION_CHANGED`；驗證：store 測試「createVideoTask 回來前已登出」綠燈，拿掉判斷時轉紅。

## 2. 付費管線

- [x] 2.1 對齊 Requirement「付費請求綁定送出當下的登入身分」與設計決策「付費流程以「token＋botId」當身分，而不是 session epoch」：`src/api/real.ts` 的 `postPaid`／`pollGeneration` 送出前 `assertSameIdentity`，新增 `resetPaidRequests()` 並由 `discard()` 呼叫；`src/api/errors.ts` 新增 `SESSION_CHANGED`，兩語系新增 `errors.sessionChanged`；驗證：`npx vitest run src/api/real.spec.ts` 的三條身分測試綠燈，拿掉 `assertSameIdentity` 或 `openKeys.clear()` 時轉紅。
- [x] 2.2 對齊 Requirement「202 受理後保留冪等鍵直到輪詢定案」與設計決策「202 保留 key 由旗標決定，定案才丟」：`postPaid` 新增 `pendingOn202`，`runGeneration` 在 `done`／`GENERATION_FAILED` 才刪 key，註解標明後端 900 秒上限；驗證：`real.spec.ts` 的「404 後沿用同一把 key」「超過上限後沿用同一把 key」「done／failed 後是新的 key」綠燈，202 改回一律刪 key 時前兩條轉紅；既有圖生影測試不變。

- [x] 2.3 對齊 Requirement「付費請求綁定送出當下的登入身分」（codex 第二輪）：`src/api/real.ts` 的 `postPaid`／`pollGeneration` 在每個 HTTP await 回來後（成功與失敗）再 `assertSameIdentity`，不符不動 `openKeys`；新增 `closeKey(op, key)` 只刪本次的 key；`runGeneration` 擷取身分後傳給 `postPaid` 與 `pollGeneration`，後者不再自行擷取；驗證：`real.spec.ts` 的「A 晚到的 200 不刪 B 的 key」「A 晚到的 202 不用 B 的憑證輪詢」「A 輪詢晚到的 done／failed 不刪 B 的 key」綠燈，`real.ts` 換回修正前版本時四條轉紅。
- [x] 2.4 對齊 Requirement「帳號範圍的寫入在回應晚到時不得寫回」：`src/stores/brand.ts` 的 `save()` 與 `src/stores/consent.ts` 的 `give()` 送出前記 epoch、`$reset()` 遞增，回來時不符不寫回（brand 的 `$reset()` 一併放掉 `saving`）；`src/api/real.ts` 的 `saveBrand` 在 Logo 上傳後 `assertSameIdentity`；驗證：`stores.spec.ts` 的「save 送出後換帳號」「give 送出後登出」與 `real.spec.ts` 的「saveBrand 上傳 Logo 途中換帳號」綠燈，三個檔換回修正前版本時三條轉紅。
- [x] 2.5 對齊 Requirement「帳號範圍的寫入在回應晚到時不得寫回」（合併上游 `9ce55ad` 之後）：`src/api/real.ts` 的 `saveBrand` 保留上游的「`PUT /brand` 失敗刪孤兒 Logo」，刪除前加 `identity() === who`；驗證：`real.spec.ts` 新增「PUT /brand 失敗刪孤兒圖」「PUT 途中換帳號後失敗不刪」兩條綠燈；拿掉刪除時前者轉紅、拿掉身分判斷時後者轉紅。

## 3. 收尾

- [x] 3.1 對齊 Requirement「登出清除帳號範圍的快取」：`npx vitest run` 全綠（324）、`npx vue-tsc --noEmit` exit 0、`npm run lint` exit 0、`npx prettier --check` 改動檔全過、i18n 兩語系 key 差異不變。
- [x] 3.3 對齊 Requirement「202 受理後保留冪等鍵直到輪詢定案」：後端 afbaeed 把 202 的冪等回放改為 24 小時，`real.ts` 的 `ponytail:` 註解與 design.md 的 900 秒說法同步更正（2.2 內文保留當時的事實）
