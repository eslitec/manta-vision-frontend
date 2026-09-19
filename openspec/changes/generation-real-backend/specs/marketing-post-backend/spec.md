## Purpose

定義行銷 PO 文頁（MV-03）接上真後端後的行為：價格來源、依輸出類型呼叫 `/marketing/image` 與 `/marketing/text`、商品介紹與海報文字兩個欄位、靈感素材、只成功一半時的呈現與單獨重做，以及下載海報。付費請求共通的冪等、重送與輪詢規則見 paid-generation-requests。

## ADDED Requirements

### Requirement: 行銷輸出類型價格由後端提供

行銷頁掛載時 SHALL 呼叫 `listModels('marketing')`（真後端為 `GET /ai-models?modelType=marketing`）。每個輸出類型的價格 SHALL 是「要配圖時加上 `marketingImage` 單價」加上「要文案時加上 `marketingText` 單價」；價格載入前「要產出什麼」選項與預估消耗 SHALL 顯示「…」，此時主按鈕、「換一張圖」「重寫文案」SHALL 停用（畫面沒有標價，後端照樣扣點）；載入失敗時 SHALL 顯示「載入失敗，請重新整理頁面。」。

#### Scenario: 顯示後端價格

- **WHEN** 後端回傳 `marketingImage` 5、`marketingText` 0
- **THEN** 「要產出什麼」三個選項依序顯示 5、0、5 顆飼料

##### Example: 價格組合

| 輸出類型                 | marketingImage | marketingText | 顯示 |
| ------------------------ | -------------- | ------------- | ---- |
| 文案＋配圖               | 5              | 0             | 5    |
| 只要文案                 | 5              | 0             | 0    |
| 只要配圖                 | 5              | 0             | 5    |
| 文案＋配圖（價格未載入） | 未載入         | 未載入        | …    |

### Requirement: 依輸出類型呼叫對應的行銷端點

`generatePost(req)` 在真後端模式 SHALL 依 `outputType` 呼叫端點：`both` 平行呼叫 `POST /marketing/image` 與 `POST /marketing/text`，兩支各自一把 `Idempotency-Key`；`textOnly` 只呼叫 `/marketing/text`；`imageOnly` 只呼叫 `/marketing/image`。image 的 body SHALL 只含 `{ imageId, posterText, ratio, inspirationId, useBrand }`，text 的 body SHALL 只含 `{ productDesc, useBrand }`。image 結果的第一張 SHALL 翻成 `poster`（`GeneratedImage`），text 結果的 `caption` 翻成 `copy`、`hashtags` 原樣保留；任一支回 202 時 SHALL 各自輪詢。只有一支失敗時 SHALL 回傳成功那一半並把失敗原因放在 `partialError`；兩支都失敗時 SHALL reject。

#### Scenario: 輸出類型對應端點

- **WHEN** 分別以三種 `outputType` 呼叫 `generatePost`
- **THEN** 送出的端點符合下表

##### Example: 端點對照

| outputType  | 送出的端點                            |
| ----------- | ------------------------------------- |
| `both`      | `/marketing/image`、`/marketing/text` |
| `textOnly`  | `/marketing/text`                     |
| `imageOnly` | `/marketing/image`                    |

#### Scenario: 兩份 body 各帶自己的欄位

- **WHEN** 以 `{ outputType: 'both', useBrand: true, imageId: 'img_1', posterText: '春季新品', ratio: '1:1', inspirationId: 'insp_1', productDesc: '純棉透氣' }` 呼叫
- **THEN** image body 等於 `{ imageId: 'img_1', posterText: '春季新品', ratio: '1:1', inspirationId: 'insp_1', useBrand: true }`，text body 等於 `{ productDesc: '純棉透氣', useBrand: true }`，兩支的 key 都存在而且不同

#### Scenario: 只成功一半

- **WHEN** `both` 時 `/marketing/image` 回 200、`/marketing/text` 回 429 `RATE_LIMITED`
- **THEN** `generatePost` resolve，`poster` 有值，`copy` 為 `undefined`，`partialError` 是那個 429 錯誤

#### Scenario: 配圖 202 後輪詢

- **WHEN** `/marketing/image` 回 202，輪詢回應為 `{ type: 'marketingImage', status: 'done', results: [...] }`
- **THEN** `poster` 取自輪詢回應 `results[0]`

### Requirement: 商品介紹與海報文字分成兩個欄位

設定區第二步的標題 SHALL 是「2. 文字內容」。輸出類型包含文案時 SHALL 顯示「商品介紹（寫貼文用）」欄位，內容送成 `productDesc`；輸出類型包含配圖時 SHALL 顯示「海報上的文字（會印在圖上）」欄位，內容送成 `posterText`；兩欄上限都是 200 字並顯示字數計數。「產生貼文」按鈕 SHALL 在以下條件都成立時才可按：要配圖時已選商品圖且海報文字不是空白；要文案時商品介紹不是空白。

#### Scenario: 只要文案

- **WHEN** 使用者選「只要文案」
- **THEN** 只顯示「商品介紹（寫貼文用）」欄位，不顯示海報文字欄位與靈感素材入口

#### Scenario: 海報文字空白不能產生

- **WHEN** 使用者選「文案＋配圖」、已選商品圖、填了商品介紹，但海報文字只有空白
- **THEN** 「產生貼文」按鈕為停用狀態

##### Example: 按鈕啟用條件

| 輸出類型   | 商品圖 | 海報文字     | 商品介紹     | 產生貼文 |
| ---------- | ------ | ------------ | ------------ | -------- |
| 文案＋配圖 | 有     | 「春季新品」 | 「純棉透氣」 | 可按     |
| 文案＋配圖 | 有     | 空白         | 「純棉透氣」 | 停用     |
| 只要文案   | 無     | 空白         | 「純棉透氣」 | 可按     |
| 只要配圖   | 無     | 「春季新品」 | 空白         | 停用     |

### Requirement: 靈感素材清單由後端提供

輸出類型包含配圖時，「探索靈感素材」入口 SHALL 顯示，說明文字 SHALL 是「選一張當海報的版型與色調參考」。第一次展開時 SHALL 呼叫 `listInspirations()`（真後端為 `GET /inspirations`，回應的 `inspirationId`／`inspirationName`／`url` 翻成 `id`／`name`／`url`），之後展開 SHALL NOT 重複請求。點選一張素材 SHALL 選取它（`aria-pressed` 為 true），再點一次 SHALL 取消選取；送出配圖時 SHALL 帶選取的 `inspirationId`，沒選時 SHALL 省略。載入失敗時 SHALL 顯示「載入失敗，請重新整理頁面。」。

#### Scenario: 展開靈感素材

- **WHEN** 使用者第一次按「探索靈感素材」，後端回 4 筆素材
- **THEN** 面板顯示 4 張縮圖，Network 有一次 `GET /inspirations`

#### Scenario: 選取後送出

- **WHEN** 使用者選取 `insp_1` 後產生配圖
- **THEN** `/marketing/image` 的 body 帶 `inspirationId: 'insp_1'`

### Requirement: 換一張圖與重寫文案只重做對應的一半

結果區 SHALL 依「這次要求了哪幾半」顯示欄位，而不是依「哪一半成功」：要求配圖時顯示配圖欄，要求文案時顯示文案欄。「換一張圖」SHALL 只重做配圖（只呼叫 `/marketing/image`，文案保留），「重寫文案」SHALL 只重做文案（只呼叫 `/marketing/text`，海報保留）；兩顆按鈕 SHALL 在生成中或自己那一半的必要欄位為空時停用。只成功一半時，失敗那一欄 SHALL 保留佔位與自己的重試按鈕，錯誤區 SHALL 點名失敗的是哪一半、附上失敗原因，並指向那一欄自己的按鈕（主按鈕會兩半重做，已成功的那半會再扣一次）。模板中的點擊處理 SHALL 寫成 `generate()`，SHALL NOT 把點擊事件當成參數傳入。

#### Scenario: 文案被限流後單獨重寫

- **WHEN** 「文案＋配圖」時配圖成功、文案回 429，使用者稍後按「重寫文案」
- **THEN** 只送出 `POST /marketing/text`，海報不變，文案欄顯示新文案

##### Example: 單獨重做的扣點

- **GIVEN** 價格為 `marketingImage` 5、`marketingText` 0，已產生一份「文案＋配圖」結果
- **WHEN** 使用者先按「換一張圖」，再按「重寫文案」
- **THEN** 第一次扣 5 顆且文案不變，第二次扣 0 顆且海報不變

#### Scenario: 只成功一半時的錯誤訊息

- **WHEN** 「文案＋配圖」時文案成功、配圖回 400 `CONTENT_BLOCKED`「這段描述被內容政策擋下了，請修改後再試」
- **THEN** 錯誤區顯示「配圖沒有成功（這段描述被內容政策擋下了，請修改後再試）。文案已完成，只重做配圖請按「換一張圖」。」

#### Scenario: 清空海報文字後不能換圖

- **WHEN** 產生結果後使用者把海報文字清空
- **THEN** 「換一張圖」按鈕為停用狀態

### Requirement: 下載海報時記錄採用

按海報下方的「下載」SHALL 用共用的 `downloadFile` 下載海報的 `url`（`url` 為空時跳過檔案），接著在海報尚未採用時以海報呼叫 `recordAdoption(poster)` 送出 `downloaded` 事件，成功後標記為已採用。沒有海報時「下載」按鈕 SHALL 停用。下載失敗時 SHALL 顯示「下載失敗：檔案可能已過期或暫時無法讀取，請稍後再試。」。

#### Scenario: 下載海報

- **WHEN** 海報為 `{ id: 'res_9', generationId: 'gen_9', url: 'https://r2.example.com/results/bot_1/p.png' }`，使用者按「下載」
- **THEN** 檔案被存下來，並送出 `POST /generations/gen_9/events`，body 為 `{ event: 'downloaded', resultId: 'res_9' }`

#### Scenario: 配圖失敗時不能下載

- **WHEN** 「文案＋配圖」時文案成功、配圖失敗
- **THEN** 配圖欄仍顯示佔位與「換一張圖」，海報的「下載」按鈕為停用狀態

#### Scenario: 只要文案時沒有配圖欄

- **WHEN** 「只要文案」的結果顯示中
- **THEN** 結果區不顯示配圖欄，也就沒有海報的「下載」按鈕
