## Purpose

定義圖生圖頁（MV-02）接上真後端後的行為：檔位與單價來源、送出的請求形狀、AI 輔助描述、結果顯示，以及存入圖庫、下載、重新生成這三個後續動作如何對應後端端點。付費請求共通的冪等、重送與輪詢規則見 paid-generation-requests。

## ADDED Requirements

### Requirement: 圖生圖檔位與單價由後端提供

圖生圖頁掛載時 SHALL 呼叫 `listModels('image')`（真後端為 `GET /ai-models?modelType=image`），以回傳的 `costFeeds` 作為「標準／進階／專業」三個檔位（`imageStandard`／`imageAdvanced`／`imagePro`）的單價；後端沒有回傳的檔位 SHALL NOT 顯示。檔位倍率 SHALL 是該檔單價除以標準檔單價；預估消耗 SHALL 是所選檔位單價乘以張數。價格載入前，模型提示的單價 SHALL 顯示「…」；載入失敗時 SHALL 顯示「載入失敗，請重新整理頁面。」。所選檔位沒有價格（未載入、載入失敗或被後端停用）時，預估消耗 SHALL 顯示「…」、「生成圖片」按鈕 SHALL 停用；預設的標準檔不在回傳中時 SHALL 改選第一張檔位卡。

#### Scenario: 顯示後端價格

- **WHEN** 後端回傳 `imageStandard` 8、`imageAdvanced` 12、`imagePro` 24
- **THEN** 三張檔位卡分別顯示 8、12、24 顆／張，倍率 ×1、×1.5、×3，提示為「倍率以標準模型 8 顆／張為基準」

##### Example: 預估消耗

| 檔位 | 張數 | 預估消耗 |
| ---- | ---- | -------- |
| 標準 | 2    | 16       |
| 進階 | 4    | 48       |
| 專業 | 2    | 48       |

#### Scenario: 後端停用某個檔位

- **WHEN** 後端只回傳 `imageStandard` 與 `imageAdvanced`
- **THEN** 頁面只顯示「標準」「進階」兩張檔位卡

#### Scenario: 價格載入失敗

- **WHEN** `GET /ai-models` 失敗
- **THEN** 預估消耗顯示「…」，「生成圖片」按鈕停用，不會送出一筆畫面標 0 顆、實際照價扣點的請求

### Requirement: 圖生圖請求以參考圖為必要條件並使用後端欄位

「生成圖片」按鈕 SHALL 在沒有參考圖、沒有描述（去掉前後空白後為空）或生成中時停用。送出的 `GenerateImageReq` SHALL 直接使用後端 `GenerateRequest` 的欄位名：`modelKey`、`imageId`（參考圖的素材 id）、`prompt`、`count`、`strength`、`negativePrompt`、`seed`、`useBrand`、`regenOf`。`strength` SHALL 是 `1 − 參考強度滑桿值`（四捨五入到小數兩位），因為畫面上越高越貼近參考圖、後端越低越貼近；`negativePrompt` 去掉前後空白後為空字串時 SHALL 省略；種子欄位清空時 SHALL 省略 `seed`，填 0 時 SHALL 送出 `seed: 0`；種子不是 0 以上的整數（負數、小數）時 SHALL NOT 送出，錯誤區 SHALL 顯示「種子要填 0 以上的整數，或留空改用隨機。」；`useBrand` SHALL 等於品牌開關的狀態。

#### Scenario: 沒有參考圖不能生成

- **WHEN** 使用者輸入描述但尚未選參考圖
- **THEN** 「生成圖片」按鈕為停用狀態

#### Scenario: 請求欄位

- **WHEN** 使用者選了參考圖 `img_1`、標準檔、2 張、參考強度 0.7、種子 0、品牌開關開啟，按下生成
- **THEN** `POST /generate` 的 body 是 `{ modelKey: 'imageStandard', imageId: 'img_1', prompt, count: 2, strength: 0.3, seed: 0, useBrand: true }`

##### Example: seed 與 negativePrompt 的轉換

| 種子欄位  | 排除元素欄位 | 送出的 seed | 送出的 negativePrompt |
| --------- | ------------ | ----------- | --------------------- |
| 清空      | 空白         | 省略        | 省略                  |
| 0         | 「 模糊 」   | 0           | 「模糊」              |
| 42        | 「文字」     | 42          | 「文字」              |
| -1 或 1.5 | 任意         | 不送出      | 不送出                |

### Requirement: AI 輔助描述呼叫真後端

描述去掉前後空白後為空時「AI 輔助描述」SHALL 停用。按「AI 輔助描述」SHALL 呼叫 `enhancePrompt(text)`，真後端為 `POST /prompt/enhance`，body 為 `{ target: 'image', prompt: text }`，逾時 40 秒，不帶 `Idempotency-Key`；成功時 SHALL 以回傳的 `enhancedPrompt` 取代描述欄內容；失敗時 SHALL 在錯誤區顯示後端訊息，SHALL NOT 靜默吞掉錯誤。

#### Scenario: 擴寫成功

- **WHEN** 描述為「白T放木桌上」，後端回 `{ enhancedPrompt: '白色純棉T恤平放在淺色木桌上，自然光' }`
- **THEN** 描述欄變成「白色純棉T恤平放在淺色木桌上，自然光」

#### Scenario: 擴寫被限流

- **WHEN** 後端回 429 `RATE_LIMITED`
- **THEN** 錯誤區顯示後端回傳的訊息，描述欄內容不變

### Requirement: 生成結果顯示暫存圖並提示保存期限

生成結果卡 SHALL 在 `url`（後端的 `tempUrl`）有值時顯示該圖片，`url` 為空字串（mock）時顯示佔位圖示；結果徽章 SHALL 疊在圖片上方。結果區提示 SHALL 顯示「結果只暫存 24 小時，按「存入圖庫」才會保留」（英文「Results are kept for 24 hours. Save to library to keep them.」），SHALL NOT 再宣稱結果會自動存回圖庫。

#### Scenario: 真後端結果

- **WHEN** 生成完成，結果的 `url` 是 `https://r2.example.com/results/bot_1/a.png`
- **THEN** 結果卡顯示這張圖，而不是佔位圖示

#### Scenario: mock 結果

- **WHEN** mock 模式生成完成，結果的 `url` 是空字串
- **THEN** 結果卡顯示佔位圖示

### Requirement: 存入圖庫使用生成結果的保存端點

對生成結果按「存入圖庫」SHALL 以該結果呼叫 `saveGenerated(name, result)`，真後端為 `POST /generations/{generationId}/save`，body 為 `{ resultId, imageName }`（不帶 `folderId`，存進未分類），回應翻成 `Asset`。成功後該結果 SHALL 標記為已存入且已採用，SHALL NOT 再另外送採用事件；已存入的結果再按一次 SHALL NOT 送出請求；送出中該結果的「存入圖庫」SHALL 停用（連點只送一發）；後端回 400 `ALREADY_SAVED`（前一發其實存進去了、回應遺失）時 SHALL 當成已存入，不顯示錯誤。`saveGenerated` 沒帶 `from` 時（AI 試穿）SHALL 繼續走 mock，不送網路請求。

#### Scenario: 存入圖庫

- **WHEN** 使用者對 `{ id: 'res_1', generationId: 'gen_1' }` 按「存入圖庫」
- **THEN** 送出 `POST /generations/gen_1/save`，body 為 `{ resultId: 'res_1', imageName: '圖生圖_res_1' }`，按鈕變成「已存入」

#### Scenario: 回應遺失後再按一次

- **WHEN** 第一次「存入圖庫」在後端成功但前端收到斷線錯誤，使用者再按一次，後端回 400 `ALREADY_SAVED`
- **THEN** 按鈕變成「已存入」並標記已採用，錯誤區不顯示「這張已經存進圖庫了」

#### Scenario: 試穿存圖仍是假資料

- **WHEN** 呼叫 `saveGenerated('x')` 不帶 `from`
- **THEN** 不送任何網路請求，回傳 `source` 為 `aiGenerate` 的素材

### Requirement: 下載生成結果時記錄採用

對生成結果按「下載」SHALL 用共用的 `downloadFile` 下載 `url`（`url` 為空時跳過檔案），接著在該結果尚未採用時以該結果呼叫 `recordAdoption(result)`，真後端為 `POST /generations/{generationId}/events`，body 為 `{ event: 'downloaded', resultId }`，成功後標記為已採用；已採用的結果再次下載 SHALL NOT 再送採用事件。下載失敗時 SHALL 顯示「下載失敗：檔案可能已過期或暫時無法讀取，請稍後再試。」。

#### Scenario: 第一次下載

- **WHEN** 使用者對尚未採用的 `{ id: 'res_2', generationId: 'gen_1' }` 按「下載」
- **THEN** 檔案被存下來，並送出 `POST /generations/gen_1/events`，body 為 `{ event: 'downloaded', resultId: 'res_2' }`

#### Scenario: 再次下載

- **WHEN** 使用者對同一張再按一次「下載」
- **THEN** 檔案再存一次，不送出採用事件

### Requirement: 重新生成只生一張並取代原結果

對某張結果按「重新生成」SHALL 以目前的表單設定送出一次 `generateImages`，帶 `regenOf` 為該張的 `resultId`、`count` 為 1，成功後 SHALL 取代原本那一格；預估消耗 SHALL 為所選檔位的單張價格。生成中時，每張結果卡的「存入圖庫」「下載」「重新生成」按鈕 SHALL 停用，避免連點重複扣點。

#### Scenario: 重新生成

- **WHEN** 結果有兩張 `res_1`、`res_2`，使用者對 `res_1` 按「重新生成」，後端回傳 `res_3`
- **THEN** body 帶 `regenOf: 'res_1'`、`count: 1`，結果變成 `res_3`、`res_2`

#### Scenario: 生成中停用按鈕

- **WHEN** 有一個生成請求正在進行
- **THEN** 所有結果卡的三顆按鈕都是停用狀態

### Requirement: 圖生圖品牌開關說明只寫品牌色票

圖生圖頁的品牌開關說明 SHALL 顯示「品牌色票」（英文「Brand colors」），SHALL NOT 顯示「浮水印」，因為後端的 `/generate` 只套用品牌色票、不疊 Logo 浮水印。其他頁面的品牌開關說明不變。

#### Scenario: 檢視品牌開關

- **WHEN** 使用者進入圖生圖頁
- **THEN** 品牌開關下方的說明是「品牌色票」
