## Purpose

定義前端呼叫後端付費生成端點（`POST /generate`、`POST /marketing/image`、`POST /marketing/text`）時共通的行為：冪等鍵與重送規則、202 之後的輪詢、飼料餘額的讀取與刷新、錯誤如何顯示，以及生成結果的下載。這一層讓「一次點擊最多扣一次點、已付費的結果一定拿得到」在圖生圖與行銷 PO 文兩頁都成立。

## ADDED Requirements

### Requirement: 付費生成請求每次點擊使用一把冪等鍵

真後端模式下，每呼叫一次付費生成方法（`generateImages`，以及 `generatePost` 裡的每一支端點）SHALL 產生一把新的 `Idempotency-Key`（`crypto.randomUUID()` 產生的 uuid），並以 `Idempotency-Key` 標頭送出；同一次呼叫裡的自動重送 SHALL 沿用同一把 key 與同一個 body 物件。例外：同一端點、同一份 body（`JSON.stringify` 相同）的前一次呼叫結果不確定——逾時、斷線、閘道 5xx 用完重送次數，409 `IDEMPOTENCY_IN_PROGRESS` 等到期限，或 `UPSTREAM_ERROR` 以外的後端 5xx——時，下一次呼叫 SHALL 沿用那一把 key；前一次回 2xx（含 202）、4xx（409 `IDEMPOTENCY_IN_PROGRESS` 除外）或 `UPSTREAM_ERROR`（後端已釋放預留）時 SHALL 產生新的 key。沿用紀錄只存在記憶體，重新整理頁面後 SHALL 產生新的 key。非付費端點（`POST /prompt/enhance`、`POST /generations/{id}/save`、`POST /generations/{id}/events`）SHALL NOT 帶 `Idempotency-Key`。view SHALL NOT 產生或持有 key。

#### Scenario: 同一次呼叫的重送沿用同一把 key 與同一份 body

- **WHEN** `generateImages` 第一次送出 `POST /generate` 逾時，API 層自動重送
- **THEN** 兩次請求的 `Idempotency-Key` 相同，request body 的字串逐字相同

##### Example: 逾時後重送

- **GIVEN** `/generate` 依序回應「逾時」與 200 `{ generationId: 'gen_1', results: [{ resultId: 'res_1', ... }] }`
- **WHEN** 呼叫 `generateImages({ modelKey: 'imageStandard', imageId: 'img_1', prompt: '白T', count: 2, useBrand: false })` 並推進 5000 毫秒
- **THEN** 共送出 2 次 `/generate`，`calls[0].headers['Idempotency-Key'] === calls[1].headers['Idempotency-Key']`，`calls[1].raw === calls[0].raw`，回傳 1 筆 `GeneratedImage`

#### Scenario: 兩次點擊使用不同的 key

- **WHEN** 使用者連續按兩次「生成圖片」，`generateImages` 被呼叫兩次，第一次已成功
- **THEN** 兩次 `POST /generate` 的 `Idempotency-Key` 不同

##### Example: key 形狀

- **GIVEN** `/generate` 每次都回 200
- **WHEN** 連續 await 兩次 `generateImages`
- **THEN** 兩把 key 都符合 `/^[0-9a-f-]{36}$/`，而且彼此不相等

#### Scenario: 結果不確定後同一份輸入再按一次沿用 key

- **WHEN** `generateImages` 丟出結果不確定的錯誤後，使用者沒改輸入又按一次
- **THEN** 第二次的 `Idempotency-Key` 與前一次相同；改了輸入（body 不同）就是新的 key

##### Example: 各種前一次結果

| 前一次結果               | 再按一次（同一份輸入） |
| ------------------------ | ---------------------- |
| 逾時 3 次後丟 `TIMEOUT`  | 沿用 key               |
| 500 `INTERNAL_ERROR`     | 沿用 key               |
| 402 `INSUFFICIENT_FEEDS` | 新的 key               |
| 502 `UPSTREAM_ERROR`     | 新的 key               |
| 200                      | 新的 key               |

#### Scenario: 非付費端點不帶 key

- **WHEN** 呼叫 `enhancePrompt('白T')`
- **THEN** `POST /prompt/enhance` 的標頭沒有 `Idempotency-Key`

### Requirement: 付費請求只在無法確定是否送達時重送

付費生成請求的逾時上限 SHALL 是 100 秒（覆寫全域 30 秒）。API 層 SHALL 只在兩種情況自動重送：(1) 無法確定是否送達——逾時、斷線（`TIMEOUT`、`NETWORK_ERROR`），或閘道吐的非後端格式 5xx（`status >= 500` 且沒有 `requestId`，例如 nginx 504、Cloudflare 524）——每 5 秒重送一次，含第一次最多送 3 次；(2) 後端回 409 `IDEMPOTENCY_IN_PROGRESS`，每 5 秒重送一次，直到第一次送出後 120 秒（100 秒逾時加 20 秒）為止；中途若有 (1) 的失敗，期限 SHALL 從最後一次 (1) 的失敗重新計算 120 秒（那一發可能才剛在後端開跑）。409 SHALL NOT 計入 3 次上限。其他錯誤（402、400、`CONTENT_BLOCKED`、後端自己回的 5xx——一定帶 `requestId`——等）SHALL NOT 重送，直接交給呼叫端。

#### Scenario: 409 持續到後端定案仍能拿到回放

- **WHEN** 第一次送出斷線，之後連續 12 次重送都拿到 409 `IDEMPOTENCY_IN_PROGRESS`，第 14 次拿到 200
- **THEN** `generateImages` 成功 resolve，14 次請求用的是同一把 key

##### Example: 斷線後 409 持續 60 秒

- **GIVEN** `/generate` 依序回應 `{ error: 'network' }`、12 次 409 `{ code: 'IDEMPOTENCY_IN_PROGRESS' }`、200 `GEN_OK`
- **WHEN** 呼叫 `generateImages` 並推進 `13 * 5000` 毫秒
- **THEN** promise resolve，`calls.length === 14`，14 次的 `Idempotency-Key` 全部相同

#### Scenario: 409 超過期限就放棄

- **WHEN** `/generate` 一直回 409 `IDEMPOTENCY_IN_PROGRESS`
- **THEN** 第一次送出後 120 秒之後的那次失敗會把 409 錯誤往上丟，之後 SHALL NOT 再送出任何請求

##### Example: 推進 125 秒

- **GIVEN** `/generate` 每次都回 409 `IDEMPOTENCY_IN_PROGRESS`
- **WHEN** 推進 125000 毫秒，記下呼叫次數後再推進 60000 毫秒
- **THEN** promise reject，錯誤碼是 `IDEMPOTENCY_IN_PROGRESS`，第二次推進後呼叫次數不變

#### Scenario: 閘道 5xx 用同一把 key 重送

- **WHEN** `/generate` 先回 HTML 524（沒有 `requestId`），再回 200
- **THEN** `generateImages` resolve，共送 2 次，兩次的 key 與原始 body 相同

#### Scenario: 後端自己回的 5xx 不重送

- **WHEN** `/generate` 回 502 `{ code: 'UPSTREAM_ERROR', requestId: 'req_1' }`
- **THEN** 只送 1 次，reject 的錯誤碼是 `UPSTREAM_ERROR`

#### Scenario: 逾時後 409 期限重算

- **WHEN** 第一次送出在 100 秒時逾時，之後 6 次重送都拿到 409，第 8 次拿到 200（約第 135 秒）
- **THEN** `generateImages` resolve，8 次請求用同一把 key

#### Scenario: 連續逾時三次就放棄

- **WHEN** `/generate` 連續 3 次逾時
- **THEN** reject `TIMEOUT`，共送 3 次，三次的 key 相同

#### Scenario: 飼料不足不重送

- **WHEN** `/generate` 回 402 `INSUFFICIENT_FEEDS`
- **THEN** 只送 1 次，reject 的錯誤碼是 `INSUFFICIENT_FEEDS`

##### Example: 付費請求設定

| 請求                    | timeout（毫秒） | Idempotency-Key |
| ----------------------- | --------------- | --------------- |
| `POST /generate`        | 100000          | 有              |
| `POST /marketing/image` | 100000          | 有              |
| `POST /marketing/text`  | 100000          | 有              |
| `POST /prompt/enhance`  | 40000           | 無              |

### Requirement: 收到 202 後輪詢生成狀態直到定案

付費生成端點回 202 `{ generationId, status: 'processing', pollAfterMs }` 時，API 層 SHALL 每隔 `max(1000, pollAfterMs)` 毫秒（沒有 `pollAfterMs` 時為 5000）呼叫 `GET /generations/{generationId}`，直到 `status` 為 `done` 或 `failed`，並 SHALL NOT 重送原本的 POST。`done` 時 SHALL 以輪詢回應的 `results`（圖）或 `caption`／`hashtags`（文案）作為結果；`failed` 時 SHALL reject 前端合成的錯誤碼 `GENERATION_FAILED`；從開始輪詢起超過 11 分鐘仍是 `processing` 時 SHALL reject `GENERATION_STILL_PROCESSING` 並停止輪詢。輪詢遇到逾時、斷線或 5xx 時 SHALL 等下一輪再問；遇到 404、401 等其他錯誤 SHALL 直接 reject。

#### Scenario: 202 之後輪詢到完成

- **WHEN** `/generate` 回 202，`GET /generations/gen_1` 依序回 `processing`、`done`
- **THEN** `generateImages` resolve 成 `done` 回應裡的結果，`/generate` 只送出 1 次

##### Example: 輪詢時序

- **GIVEN** `/generate` 回 202 `{ generationId: 'gen_1', status: 'processing', pollAfterMs: 5000 }`，`/generations/gen_1` 依序回 `processing`、`done`（`results: [{ resultId: 'res_1', tempUrl: 'https://r2.example.com/results/bot_1/a.png' }]`）
- **WHEN** 推進 5000 毫秒，再推進 5000 毫秒
- **THEN** 第一次推進後請求 URL 依序為 `['/generate', '/generations/gen_1']`；第二次推進後 resolve 成 `[{ id: 'res_1', generationId: 'gen_1', url: 'https://r2.example.com/results/bot_1/a.png', adopted: false }]`

#### Scenario: 輪詢到失敗

- **WHEN** 輪詢回應 `status: 'failed'`
- **THEN** reject，錯誤碼是 `GENERATION_FAILED`；訊息 SHALL 說明「若是內容被審核擋下，飼料不會退回，請修改描述後再試」，SHALL NOT 叫使用者原樣再試（202 之後被審核擋下，後端的 `failed` 是結清扣點）

#### Scenario: 輪詢超過上限

- **WHEN** 輪詢超過 11 分鐘仍是 `processing`
- **THEN** reject，錯誤碼是 `GENERATION_STILL_PROCESSING`，訊息包含 generationId，之後不再送出輪詢請求

##### Example: 推進 12 分鐘

- **GIVEN** `/generations/gen_1` 永遠回 `processing`
- **WHEN** 推進 `12 * 60000` 毫秒，記下呼叫次數後再推進 60000 毫秒
- **THEN** reject 的錯誤碼是 `GENERATION_STILL_PROCESSING`，第二次推進後呼叫次數不變

#### Scenario: 輪詢遇到 5xx 繼續等

- **WHEN** 輪詢第一次拿到反向代理吐的 HTML 502，第二次拿到 `done`
- **THEN** `generateImages` resolve，`/generate` 只送出 1 次

### Requirement: 飼料餘額讀取真後端並在生成後刷新

真後端模式下，`getFeed()` SHALL 呼叫 `GET /feeds` 並只回傳 `{ balance }`。圖生圖頁與行銷頁每次付費生成結束後（成功或失敗都算）SHALL 呼叫 `feed.refresh()` 刷新右上角餘額；刷新本身失敗時 SHALL NOT 覆蓋生成的錯誤訊息。

#### Scenario: 讀取餘額

- **WHEN** 後端 `GET /feeds` 回 `{ balance: 1224, monthlyLimit: null, monthUsed: 0, estImages: 153, estVideos: 27 }`
- **THEN** `getFeed()` 回傳 `{ balance: 1224 }`

#### Scenario: 生成失敗也刷新餘額

- **WHEN** 生成回 400 `CONTENT_BLOCKED`（後端已扣點）
- **THEN** 頁面顯示錯誤訊息，並呼叫一次 `feed.refresh()`，右上角顯示扣點後的餘額

### Requirement: 真後端模式停用模擬儲值

`realApi.topUpFeed` SHALL 明確為 `undefined`，SHALL NOT 沿用 mock 的假儲值；TopUpDialog 在真後端模式 SHALL 顯示既有的「這個環境尚未支援模擬儲值」訊息，SHALL NOT 改動右上角餘額，也 SHALL NOT 送出任何儲值請求。mock 模式的儲值行為不變。

#### Scenario: 真後端模式按儲值

- **WHEN** `VITE_USE_MOCK=false`，使用者在任一頁開啟儲值彈窗並選擇方案
- **THEN** 彈窗顯示「這個環境尚未支援模擬儲值」，餘額不變，Network 沒有儲值請求

##### Example: 介面檢查

- **GIVEN** `realApi` 與 `mockApi`
- **WHEN** 檢查 `realApi.topUpFeed` 與 `typeof mockApi.topUpFeed`
- **THEN** 前者是 `undefined`，後者是 `'function'`

### Requirement: 生成錯誤顯示後端提供的訊息

生成、存入圖庫、下載、輔助描述、載入價格與靈感失敗時，頁面 SHALL 用既有的 `displayMessage(e, fallback)` 顯示後端回傳的 `message`；402 `INSUFFICIENT_FEEDS` SHALL 沿用既有的飼料不足文案。前端合成的錯誤碼 `GENERATION_FAILED`、`GENERATION_STILL_PROCESSING` SHALL 帶有依目前語系產生的 `message`（i18n `errors.backgroundGenerationFailed`、`errors.generationStillProcessing`）。新的後端錯誤碼（`CONTENT_BLOCKED`、`UPSTREAM_ERROR`、`MONTHLY_LIMIT_EXCEEDED` 等）SHALL NOT 新增 i18n 文案。

#### Scenario: 內容被審核擋下

- **WHEN** `POST /generate` 回 400 `{ code: 'CONTENT_BLOCKED', message: '這段描述被內容政策擋下了，請修改後再試' }`
- **THEN** 頁面的錯誤區顯示「這段描述被內容政策擋下了，請修改後再試」

#### Scenario: 飼料不足

- **WHEN** `POST /generate` 回 402 `INSUFFICIENT_FEEDS`
- **THEN** 頁面顯示「飼料不足，請先儲值。」

### Requirement: 下載檔案走同一份共用邏輯

圖生圖結果、行銷海報與圖庫批次下載 SHALL 共用 `downloadFile(url, filename?)`：先以 `fetch(url, { cache: 'no-store' })` 讀成 Blob，再用同源的 blob 網址觸發下載。`fetch` 本身失敗（CORS、斷網）時 SHALL 退回 `window.open(url, '_blank', 'noopener')`；HTTP 非 2xx 時 SHALL 丟錯，SHALL NOT 把錯誤頁存成檔案，也 SHALL NOT 開新分頁。

#### Scenario: fetch 失敗退回開新分頁

- **WHEN** `fetch` 丟出 `TypeError`
- **THEN** 呼叫 `window.open(url, '_blank', 'noopener')`，`fetch` 的第二個參數是 `{ cache: 'no-store' }`

#### Scenario: 暫存過期

- **WHEN** `fetch` 回 404
- **THEN** `downloadFile` reject，`window.open` 沒被呼叫

#### Scenario: 圖庫批次下載遇到 404

- **WHEN** 圖庫勾選的素材中有一張的網址回 404
- **THEN** 圖庫錯誤區顯示「下載失敗：檔案可能已過期或暫時無法讀取，請稍後再試。」，其餘素材照常下載

### Requirement: mock 模式與真後端介面同形

`mockApi` 與 `realApi` 的 `listModels`、`generateImages`、`generatePost`、`saveGenerated`、`recordAdoption`、`listInspirations`、`getFeed`、`enhancePrompt` SHALL 有相同簽名；`VITE_USE_MOCK` 沒設或不是 `false` 時，兩頁 SHALL 用 mock 跑完整流程。mock 的價格 SHALL 對齊後端：`imageStandard` 8、`imageAdvanced` 12、`imagePro` 24、`marketingImage` 5、`marketingText` 0；帶 `regenOf` 時 SHALL 只扣一張；同一張結果重複 `recordAdoption` SHALL 只計一次採用；行銷海報的採用 SHALL NOT 計入採用率（同後端只算圖生圖）。

#### Scenario: mock 生成扣點

- **WHEN** mock 模式以 `imageStandard`、`count: 3` 呼叫 `generateImages`
- **THEN** 餘額減少 24

##### Example: mock 扣點表

| 呼叫                                                                      | 扣點 |
| ------------------------------------------------------------------------- | ---- |
| `generateImages({ modelKey: 'imageStandard', count: 3 })`                 | 24   |
| `generateImages({ modelKey: 'imageStandard', count: 2, regenOf: 'r_1' })` | 8    |
| `generatePost({ outputType: 'both' })`                                    | 5    |
| `generatePost({ outputType: 'textOnly' })`                                | 0    |
| `generatePost({ outputType: 'imageOnly' })`                               | 5    |

#### Scenario: 已接上的方法不是 mock 的那一份

- **WHEN** 檢查 `realApi.getFeed`、`listModels`、`enhancePrompt`、`generateImages`、`generatePost`、`saveGenerated`、`recordAdoption`、`listInspirations`
- **THEN** 每一支都不等於 `mockApi` 的同名方法

### Requirement: 生成中離開頁面先確認

生成結果只存在頁面元件裡（後端不會自動存進圖庫，前端也沒有生成紀錄頁），而後端照樣結清飼料。圖生圖頁與行銷頁在生成中（含同步等待與 202 輪詢）SHALL 攔下站內導頁並以確認框詢問「生成還在進行中，離開這一頁就拿不到這次的結果，飼料仍會照扣。確定要離開嗎？」，取消時 SHALL 留在原頁；關閉或重新整理分頁時 SHALL 觸發瀏覽器的離開提醒。沒有生成中時 SHALL NOT 攔下。任務中心對圖生圖任務 SHALL NOT 顯示「已存入圖庫」，完成文案 SHALL 是「已完成・結果不會自動存入圖庫，請在圖生圖頁按「存入圖庫」」，SHALL NOT 顯示「查看」按鈕與推算的剩餘秒數；面板底部說明 SHALL 只對影片說「離開頁面不影響生成」。

#### Scenario: 生成中點側欄

- **WHEN** 圖生圖生成中，使用者點側欄「圖庫」並在確認框按取消
- **THEN** 仍停在圖生圖頁，生成完成後結果照常顯示

##### Example: mock 模式標準檔 2 張

- **GIVEN** mock 模式、已選參考圖、描述「白T放木桌上」，按下「生成圖片」
- **WHEN** 生成完成前點 `a.sidebar__item[href="/library"]`，確認框按取消
- **THEN** `location.pathname` 仍是 `/generate/image`，之後出現 2 張結果；生成完成後再點同一個連結則直接進 `/library`，不出現確認框

#### Scenario: 任務中心的圖生圖任務

- **WHEN** 圖生圖任務完成後打開任務中心
- **THEN** 該任務顯示「已完成・結果不會自動存入圖庫，請在圖生圖頁按「存入圖庫」」，沒有「查看」按鈕

##### Example: 兩種任務並列

| 任務 kind | 完成文案                                                 | 「查看」按鈕 | 生成中剩餘秒數 |
| --------- | -------------------------------------------------------- | ------------ | -------------- |
| `image`   | 已完成・結果不會自動存入圖庫，請在圖生圖頁按「存入圖庫」 | 無           | 不顯示         |
| `video`   | 已完成・已存入圖庫›影片                                  | 有           | 顯示           |
