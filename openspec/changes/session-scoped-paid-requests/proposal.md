## Why

外部模型（codex）對抗式審查對這條分支提出 4 條高嚴重度問題，對原始碼確認都屬實，後果是「重複扣點」或「換帳號後看到／扣到別人的東西」：

1. `src/stores/session.ts` 的 `discard()` 只清 brand、consent、generationTasks；飼料餘額（`feed` store 的 `loaded`）與資料夾清單（`useAssets` 的模組級單例）沒清，同一分頁換帳號會跳過 `GET /feeds`、`GET /folders`，直接顯示上一個人的餘額與資料夾；登出前發出的舊回應也能在登出後寫回狀態。
2. `createVideoTask` 在 `await api.createVideoJob` 之後無條件建任務並輪詢，登出後才回來的回應會把上一個帳號的任務塞回清單，並用下一個帳號的憑證輪詢。
3. `postPaid` 的自動重送與 `pollGeneration` 的輪詢，認證標頭是每次送出當下才從全域 `ctx` 取的：等待重送的 5 秒內登出並換帳號，重送就會帶新帳號的憑證（扣到別人的點）；沒定案的 `Idempotency-Key` 也只以「端點＋body」分組，登出不清。
4. `postPaid` 收到任何 2xx 都丟掉 key，但 `/generate` 這類端點的 202 只是「已受理」（已預留點數）：之後輪詢沒定案就斷掉（404、超過 11 分鐘上限）時，同一份輸入再按一次會拿新 key 再扣一次。

## What Changes

- `feed` store 新增 `reset()`，`refresh()` 以 epoch 丟棄登出前發出的舊回應；`useAssets` 新增 `resetFolders()`，`loadFolders()` 同樣以 epoch 防護；`session.discard()` 統一呼叫 `feed.reset()`、`resetFolders()`、`resetPaidRequests()`。
- `createVideoTask` 送出前記下 store 的 epoch，回應回來時已 `reset` 就丟 `SESSION_CHANGED`，不建任務、不輪詢。
- `postPaid` 與 `pollGeneration` 開始時記下登入身分（token＋botId），每次送出前確認沒變，變了就丟 `SESSION_CHANGED`，不重送、不輪詢；新增 `resetPaidRequests()` 在登出時清掉沒定案的 key。
- `postPaid` 新增 `pendingOn202` 旗標（只有 `runGeneration` 帶）：202 時保留 key，`runGeneration` 在輪詢得到 `done`／`failed` 才丟；其餘輪詢錯誤保留，同輸入重送會帶同一把 key，後端回放同一個 202（同一個 `generationId`）。影片（`POST /video` 的 202 即完整答案）不帶旗標，行為不變。上限：後端只記 202 到 `idempotency_pending_ttl_seconds`（900 秒）。
- 新增錯誤碼 `CLIENT_ERROR_CODES.SESSION_CHANGED` 與 i18n `errors.sessionChanged`（兩語系）。
- 請求內容與欄位不變。

## Non-Goals

- 不做「生成紀錄頁」或把待完成的 generation 持久化到 sessionStorage（codex 的延伸建議）；重新整理後 key 仍會消失（既有的 `ponytail:` 取捨）。
- 不用 AbortController 取消已送出的請求：已送到後端的請求取消不了扣點，只保證不再重送、不採用晚到的回應。
- 不動 `models` store：`GET /ai-models` 是全站目錄，不分帳號。
- 不動後端。

## Capabilities

### New Capabilities

- `session-scoped-requests`: 登出清理帳號範圍狀態、付費請求綁登入身分、202 受理後保留冪等鍵到定案。

## Impact

- Affected specs: `session-scoped-requests`（新增）
- Affected code:
  - Modified:
    - src/api/real.ts
    - src/api/real.spec.ts
    - src/api/errors.ts
    - src/stores/session.ts
    - src/stores/feed.ts
    - src/stores/generationTasks.ts
    - src/stores/stores.spec.ts
    - src/composables/useAssets.ts
    - src/lang/en.ts
    - src/lang/zh-Hant.ts
