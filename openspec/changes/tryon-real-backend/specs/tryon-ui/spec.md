## ADDED Requirements

### Requirement: 試穿生成走真後端

按下「生成試穿」時系統 SHALL 呼叫 `api.tryOn({ modelSource, modelRefId, clothImageId })`：`modelSource` 依目前模特分頁決定（「內建模特庫」→ `material`、`modelRefId` 為選中的 `materialId`；「上傳模特照」→ `upload`、`modelRefId` 為選中模特照的 `imageId`），`clothImageId` 為所選服飾素材的 `id`；「選擇服飾素材」彈窗 SHALL NOT 列出模特照（`source: 'tryonModel'`）。真後端 SHALL 以既有付費管線送 `POST /tryon`（`Idempotency-Key`、100 秒逾時、只在不確定送達時重送），收到 202 時 SHALL 輪詢 `GET /generations/{id}` 直到 `done` 或 `failed`，並把 `results[0]` 翻成 `GeneratedImage`（`id`＝`resultId`、`url`＝`tempUrl`）。尚未選模特、尚未選服飾、價格尚未載入或生成進行中時，「生成試穿」與「重新生成」SHALL 停用。後端回 403 `CONSENT_REQUIRED` 時 SHALL 把本機同意狀態改回未同意並開啟肖像同意視窗，不顯示生成失敗；飼料不足顯示既有文案，其他錯誤顯示後端訊息。生成結束（不論成敗）SHALL 刷新飼料餘額。生成進行中離開頁面 SHALL 先確認。假資料模式 SHALL 走同一條呼叫路徑，由 mock 的 `tryOn` 扣 12 顆並回一張帶圖的結果。

#### Scenario: 內建模特＋服飾素材生成

- **WHEN** 已同意的使用者在「內建模特庫」選一位模特、選一張服飾素材後按「生成試穿」
- **THEN** 送出 `POST /tryon` body `{ modelSource: 'material', modelRefId: <materialId>, clothImageId: <imageId> }` 一發，帶 `Idempotency-Key`；200 後結果區顯示 `results[0].tempUrl` 的圖片

#### Scenario: 上傳的模特照生成

- **WHEN** 使用者在「上傳模特照」分頁點選清單中的一張後按「生成試穿」
- **THEN** body 的 `modelSource` 為 `upload`、`modelRefId` 為該張的 `imageId`

#### Scenario: 逾時回 202

- **WHEN** `POST /tryon` 回 202 `{ generationId, pollAfterMs }`
- **THEN** 前端每 `pollAfterMs` 打 `GET /generations/{id}`，不再送 `/tryon`；`done` 後顯示結果

#### Scenario: 後端說尚未同意

- **WHEN** `POST /tryon` 回 403 `CONSENT_REQUIRED`
- **THEN** 頂部同意提示重新出現、肖像同意視窗開啟、底部不顯示「生成失敗」

#### Scenario: 缺件時按鈕停用

- **WHEN** 尚未選服飾素材、或上傳分頁沒有選中任何模特照、或價格尚未載入
- **THEN** 「生成試穿」為 `disabled`

---

### Requirement: 肖像同意讀寫後端

頁面載入時系統 SHALL 呼叫 `api.getConsent()`（真後端 `GET /users/me/consent`，回 `{ consented: portraitConsent }`）決定是否顯示頂部同意提示；回應到達前 SHALL NOT 顯示提示，上傳／生成的同意檢查 SHALL 等回應到達後才判斷。同意狀態綁使用者：登出 SHALL 清除本機同意狀態，下一個帳號 SHALL 重新讀取。肖像同意視窗的條款內容 SHALL 顯示品牌設定的肖像權同意條款模板（brand store 的 `portraitConsent`；尚未設定時為 i18n `brandSettings.defaults.portraitConsent` 的預設文字），保留換行。使用者勾選確認並按「我知道了」時 SHALL 呼叫 `api.giveConsent()`（真後端 `PUT /users/me/consent` body `{ consent: true }`），成功後關閉視窗並視為已同意；已同意時按「我知道了」SHALL NOT 重送 `PUT`；`PUT` 失敗時視窗 SHALL 留著並在視窗內顯示錯誤。視窗 SHALL NOT 提供「下載條款範本（PDF）」按鈕。

#### Scenario: 頁面載入讀取同意狀態

- **WHEN** 使用者進入試穿頁
- **THEN** 送出 `GET /users/me/consent`；`portraitConsent: true` 時不顯示頂部同意提示，`false` 時顯示

#### Scenario: 同意視窗顯示品牌模板

- **WHEN** 使用者開啟肖像同意視窗
- **THEN** 條款區顯示品牌設定「合規與授權」的肖像權同意條款模板文字；沒有設定時顯示預設文字；沒有 PDF 按鈕

##### Example: 模板來源

| GIVEN（`GET /brand` 的 `portraitConsentTemplate`） | THEN（視窗 `.terms__text`）                                   |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `"甲方同意…\n乙方…"`                               | 顯示該文字，`\n` 以換行呈現                                   |
| `null`                                             | 顯示 i18n `brandSettings.defaults.portraitConsent` 的預設文字 |
| 任一情況                                           | 視窗內沒有「下載條款範本（PDF）」按鈕                         |

#### Scenario: 按「我知道了」

- **WHEN** 使用者勾選確認後按「我知道了」
- **THEN** 送出 `PUT /users/me/consent` body `{ consent: true }` 一發；回 200 後視窗關閉、頂部提示消失

#### Scenario: 已同意者從「查看條款」開視窗

- **WHEN** `GET /users/me/consent` 已回 `true` 的使用者開啟視窗、勾選並按「我知道了」
- **THEN** 不送出 `PUT /users/me/consent`，視窗關閉

#### Scenario: 同一分頁換帳號

- **WHEN** 已同意的使用者登出，另一個尚未同意的使用者在同一分頁登入並進入試穿頁
- **THEN** 重新送出 `GET /users/me/consent`，依其回應顯示提示；選取模特照時同意視窗開啟、不送 `POST /upload`

---

### Requirement: 模特照持久化

「上傳模特照」的上傳 SHALL 經既有上傳路徑並帶 `source: 'tryonModel'`（真後端 multipart `POST /upload` 表單多一個 `source` 欄位；mock 標成 `tryonModel`）。頁面載入時系統 SHALL 呼叫 `api.listImages({ source: 'tryonModel', pageSize: 20 })` 回填「已上傳模特」清單（`id`＝`imageId`、名稱、縮圖），重新整理後清單 SHALL NOT 消失。清單標題 SHALL 顯示「n / 20」；第 21 張由後端拒絕（400 `VALUE_OUT_OF_RANGE`）時 SHALL 在底部固定區顯示後端訊息、清單不新增。清單 SHALL NOT 顯示審核狀態、「需重傳」文案或示範列。清單每列 SHALL 可點選成為當前模特（`aria-pressed`），上傳成功的那張 SHALL 自動成為當前模特；刪除選中的那張後 SHALL 清空選取。圖庫卡片對 `source: 'tryonModel'` 的素材 SHALL 顯示「模特照」標籤（i18n `sources.tryonModel`）。

#### Scenario: 上傳帶 source

- **WHEN** 已同意的使用者選取一張模特照
- **THEN** `POST /upload` 表單含 `file` 與 `source=tryonModel`；201 後清單新增一列且該列為選中狀態

#### Scenario: 重新整理後清單仍在

- **WHEN** 使用者重新整理試穿頁並切到「上傳模特照」
- **THEN** 送出 `GET /images?source=tryonModel&page=1&pageSize=20`，清單列出回應的每一張

#### Scenario: 第 21 張

- **WHEN** 這隻機器人已有 20 張模特照，使用者再上傳一張
- **THEN** 後端回 400 `VALUE_OUT_OF_RANGE`，底部固定區顯示後端訊息，清單仍是 20 列

#### Scenario: 點選清單列

- **WHEN** 使用者點清單中某一列
- **THEN** 該列 `aria-pressed="true"` 並呈選中樣式，其他列為 `false`

---

### Requirement: 顯示飼料消耗

設定區底部 SHALL 顯示預估飼料消耗與生成動作；預估值 SHALL 讀 `GET /ai-models?modelType=tryon` 回傳的第一個檔位的 `costFeeds`（目前 12 顆），載入前顯示「…」且生成鈕停用；回應的 `items` 為空時 SHALL 顯示載入失敗訊息（`errors.loadFailed`）。設定區 SHALL NOT 顯示「套用品牌設定」開關（契約定案試穿不做品牌介入，取代原「顯示品牌設定開關與飼料消耗」要求）。

#### Scenario: 使用者檢視設定區底部

- **WHEN** 使用者檢視設定區
- **THEN** 底部顯示「預估消耗 12 顆飼料」與「生成試穿」，沒有品牌設定開關

##### Example: 價格載入前後

| GIVEN                                   | THEN                                            |
| --------------------------------------- | ----------------------------------------------- |
| `GET /ai-models?modelType=tryon` 尚未回應 | 預估消耗顯示「…」，「生成試穿」`disabled`      |
| 回應 `items: [{ modelKey: 'tryonStandard', costFeeds: 12 }]` | 預估消耗顯示「12 顆飼料」，選齊模特與服飾後可按 |

## REMOVED Requirements

### Requirement: 顯示品牌設定開關與飼料消耗

**Reason**: 契約定案試穿不做品牌介入（`POST /tryon` 無 `useBrand`），開關拿掉；飼料消耗改由「顯示飼料消耗」要求描述（單價讀後端）。

**Migration**: `TryOnView.vue` 移除 `BrandToggle`／`applyBrand`／`goBrandSettings`；估價改讀 `GET /ai-models?modelType=tryon`。

## MODIFIED Requirements

### Requirement: 模特可用內建或上傳真人照

選擇模特 SHALL 提供「內建模特庫」與「上傳模特照」兩種來源。選「上傳模特照」時 SHALL 提供可開啟本地檔案選取的上傳控制項（`accept` 限 `image/jpeg,image/png,image/webp`），已上傳的清單來自後端（見「模特照持久化」）且每列可點選成為當前模特。清單 SHALL NOT 顯示審核狀態、「需重傳」文案或示範列。

#### Scenario: 使用者上傳真人模特照

- **WHEN** 已完成肖像同意的使用者切到「上傳模特照」並點擊上傳區選檔
- **THEN** 檔案以 `source=tryonModel` 上傳到後端，清單新增一列（後端回傳的名稱與縮圖）並自動選中

#### Scenario: 上傳真人照片但尚未同意肖像使用

- **WHEN** 使用者尚未完成肖像使用同意就選取真人照片
- **THEN** 檔案不上傳，自動跳出肖像同意視窗要求先完成同意

##### Example: 未同意選檔

| GIVEN                                             | WHEN                | THEN                                          |
| ------------------------------------------------- | ------------------- | --------------------------------------------- |
| `GET /users/me/consent` 回 `false`、清單 0 列     | 選取 `model.png`    | 無 `POST /upload`、清單仍 0 列、同意視窗開啟  |
| 按「我知道了」（`PUT` 回 200）後再選取同一檔      | 選取 `model.png`    | `POST /upload` 一發（含 `source=tryonModel`） |

---

### Requirement: 生成前需完成肖像同意

在使用者尚未完成肖像同意（`GET /users/me/consent` 回 `false`）時，SHALL 於頂部顯示同意提示，且按下生成時 SHALL 先要求完成同意才繼續；同意視窗按「我知道了」SHALL 寫入後端（`PUT /users/me/consent`）。

#### Scenario: 未同意即嘗試生成

- **WHEN** 使用者未完成肖像同意就按「生成試穿」
- **THEN** 跳出肖像同意視窗，不送出 `POST /tryon`

---

### Requirement: 首次進入與生成完成狀態分離

系統 SHALL 在首次進入且尚未生成時顯示空的試穿結果預覽；完成生成後結果區 SHALL 顯示 `results[0]` 的圖片（`img.result__img`，`object-fit: contain`）與結果動作，並提示結果只暫存 24 小時。空預覽的播放圖示（`IconPlayCircle`）SHALL 在幾何與顏色上對齊 Figma 設計稿（node `841:618`）：圓形描邊 `stroke-width: 2`、半徑約為 viewBox 的 1/3（非撐滿整個圖示框），顏色為 `#aeb8cc`。

#### Scenario: 使用者首次進入 MV-05

- **WHEN** 尚未完成任何試穿生成
- **THEN** 結果區顯示空預覽（播放圖示）
- **AND** 不顯示「存入圖庫／下載／重新生成」動作

##### Example: 生成前後的結果區

| 狀態         | `.result__box` 內容              | `.result__actions` |
| ------------ | -------------------------------- | ------------------ |
| 尚未生成     | `IconPlayCircle`（無 `img`）     | 不渲染             |
| 生成完成     | `img.result__img[src=tempUrl]`   | 三顆按鈕           |

#### Scenario: 試穿生成完成

- **WHEN** 試穿生成成功
- **THEN** 結果區顯示 `results[0].tempUrl` 的圖片與「存入圖庫／下載／重新生成」動作

#### Scenario: 空預覽播放圖示對齊設計稿

- **WHEN** 使用者檢視尚未生成的試穿結果空預覽
- **THEN** 播放圖示的圓形比例、描邊粗細與顏色皆與 Figma `841:618` 提供的數值一致

---

### Requirement: 結果可存入圖庫／下載／重新生成

生成完成後 SHALL 提供「存入圖庫」「下載」「重新生成」動作。「存入圖庫」SHALL 呼叫 `saveGenerated(name, { generationId, id })`（真後端 `POST /generations/{id}/save` body `{ resultId, imageName }`，來源由後端標 `tryon`），成功或後端回 `ALREADY_SAVED` 都 SHALL 顯示「已存入」。「下載」SHALL 走共用的 `downloadFile(url)`，並在首次下載後呼叫 `api.recordAdoption({ generationId, id })`（`POST /generations/{id}/events` `{ event: 'downloaded', resultId }`）。「重新生成」SHALL 以目前選取的模特與服飾再送一次 `POST /tryon`（同圖生圖頁，不快照上一次的組合）。生成進行中三個動作 SHALL 停用。

#### Scenario: 使用者存入試穿結果

- **WHEN** 使用者對已生成的試穿圖點擊「存入圖庫」
- **THEN** 送出 `POST /generations/{generationId}/save` body `{ resultId, imageName }`；結果落地成圖庫素材，按鈕顯示「已存入」

#### Scenario: 使用者下載試穿結果

- **WHEN** 使用者點擊「下載」
- **THEN** 以 `downloadFile(tempUrl)` 下載，並送出 `POST /generations/{generationId}/events` `{ event: 'downloaded', resultId }` 一次；再次下載不重送
