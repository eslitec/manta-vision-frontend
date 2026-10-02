## ADDED Requirements

### Requirement: 圖生影生成走真後端

使用者在確認視窗按下「確認生成」時，系統 SHALL 呼叫 `api.createVideoJob({ sourceImageId, modelKey, template, ratio, taskName })`；真後端 SHALL 以付費管線送出 `POST /video`（帶 `Idempotency-Key`，只在不確定送達時以同一把 key 與同一份 body 重送），body 的 `template` 為 `cameraPan`／`rotate`／`textIn`／`zoomBreath`、`modelKey` 為 `videoStandard`／`videoAdvanced`／`videoPro`。收到 202 時系統 SHALL 以回傳的 `taskId` 建立任務並刷新飼料餘額。尚未選來源圖、價格尚未載入或送出進行中時，「生成影片」SHALL 停用。402 飼料不足 SHALL 顯示既有的飼料不足文案，其他錯誤 SHALL 顯示後端訊息。

#### Scenario: 送出一次生成

- **WHEN** 使用者選好來源圖、模板與比例後確認生成
- **THEN** 恰好送出一發 `POST /video`，body 只有上述五個欄位並帶 `Idempotency-Key`，任務中心多一筆進行中的任務

#### Scenario: 未選來源圖

- **WHEN** 使用者尚未選來源圖
- **THEN** 「生成影片」按鈕為停用狀態

#### Scenario: 飼料不足

- **WHEN** `POST /video` 回 402 `INSUFFICIENT_FEEDS`
- **THEN** 頁面顯示「飼料不足，請先儲值。」，不建立任務

### Requirement: 影片進度輪詢與結果呈現

系統 SHALL 每 3 秒呼叫 `GET /video/{taskId}` 直到 `done` 或 `failed`，進度與剩餘時間 SHALL 使用後端回傳的 `progress`／`etaSeconds`（`etaSeconds` 為 0 而任務仍在進行時 SHALL 顯示「比預期久一些，請稍候…」而非「約剩 0 秒」），扣點額 SHALL 以最近一次回傳的 `costFeeds` 為準。輪詢遇斷線、逾時或 5xx SHALL 下一輪再問，遇其他錯誤 SHALL 停止輪詢並把任務標為失敗。`done` 時預覽區 SHALL 播放 `resultUrl` 的影片，「下載」SHALL 把該檔存成「任務名.mp4」，耗時 SHALL 使用後端的 `durationMs`；`failed` 時預覽區與任務中心 SHALL 顯示 `failReason` 對應的文案（上游或存檔失敗說明未扣飼料，內容審核擋下說明飼料照扣）。任務完成或失敗後系統 SHALL 刷新飼料餘額。

#### Scenario: 生成完成可播放與下載

- **WHEN** 輪詢到 `done`
- **THEN** 預覽區出現 `video` 元素、`src` 為 `resultUrl`，按「下載」存下該影片，停止輪詢

#### Scenario: 輪詢暫時失敗不中斷

- **WHEN** 某一輪 `GET /video/{taskId}` 回 503 或斷線
- **THEN** 下一輪繼續輪詢，任務不標為失敗

#### Scenario: 超過預估時間不顯示約剩 0 秒

- **WHEN** 任務仍在 `processing`，輪詢回 `etaSeconds: 0`
- **THEN** 預覽區與任務中心都顯示「比預期久一些，請稍候…」，不顯示「約剩 0 秒」

#### Scenario: 上游失敗顯示原因

- **WHEN** 輪詢到 `failed`、`failReason` 為 `upstreamError`
- **THEN** 預覽區與任務中心都顯示「生成失敗・AI 服務暫時無法完成，未扣飼料」

### Requirement: 重新整理後還原影片任務

進入已登入畫面時，系統 SHALL 呼叫 `GET /video?limit=10`，把尚未在任務中心的任務併入（當作已讀），`pending`／`processing` 的任務 SHALL 繼續輪詢。還原的任務沒有原始請求參數，任務中心 SHALL NOT 對它們顯示「重試」。登出時系統 SHALL 清空任務並停止所有輪詢。

#### Scenario: 重新整理後仍看得到生成中的影片

- **WHEN** 影片生成中使用者重新整理頁面
- **THEN** 任務中心出現該任務並繼續更新進度

#### Scenario: 登出後不再輪詢

- **WHEN** 使用者在影片生成中登出
- **THEN** 任務中心清空，不再呼叫 `GET /video/{taskId}`

### Requirement: 影片檔位與價格讀自後端

頁面載入時系統 SHALL 呼叫 `GET /ai-models?modelType=video`，檔位卡、倍率、預估消耗與確認視窗的金額 SHALL 使用後端單價；後端沒有回的檔位 SHALL NOT 顯示。

#### Scenario: 價格來自後端

- **WHEN** 後端回標準 45、進階 90、專業 180
- **THEN** 三張卡依序顯示 45／90／180 顆，選專業檔時預估消耗為 180

## MODIFIED Requirements

### Requirement: 送出生成前二次確認

系統 SHALL 在使用者點擊「生成影片」、影片完成後的「重新生成」、或任務面板失敗影片的「重試」後，顯示同一個確認彈窗（`ConfirmGenerateDialog.vue`，含模型與預估飼料消耗），使用者確認後才真正送出生成請求；取消或按 Esc SHALL NOT 送出任何請求。「重新生成」的金額 SHALL 與「生成影片」相同（目前所選檔位的後端單價）；「重試」的金額 SHALL 取 `GET /ai-models?modelType=video` 中該任務原檔位的單價（任務記錄上的扣點額失敗後已釋放為 0，不得拿來顯示），原檔位已不在清單時 SHALL NOT 開啟確認彈窗，改在該筆任務顯示無法重試的原因。任務面板是全域元件，「重試」的確認彈窗 SHALL 在任何頁面都能開啟，開啟前先關閉任務面板。重試的失敗任務 SHALL 在新任務建立成功後才從面板移除；取消或送出失敗時該筆 SHALL 原樣保留（送出失敗時顯示原因）。確認彈窗（`ConfirmGenerateDialog.vue`）的標題、內文與各列文字 SHALL 在字級與顏色上對齊 Figma 設計稿（node `125:805`）：標題 18px Bold `#383c4b`；內文 16px Regular `#606692`；「使用模型」「剩餘飼料」列的標籤 14px `#b4b9c4`、數值 14px `#606692`；「本次消耗」列標籤 14px `#383c4b`、金額 16px Bold `#ea903a`。彈窗的間距與圓角 SHALL 同樣對齊該節點：外層彈窗圓角 10px、內部各區塊（icon＋標題／內文／三列資訊／按鈕列）以 16px 的 `gap` 分隔；icon 為 40px 圓角矩形（8px 圓角）；三列資訊之間以 16px `gap` 分隔且無分隔線；「本次消耗」列內距四邊統一 12px；icon 與文字間距 4px；兩顆按鈕間距 12px。

#### Scenario: 確認後送出

- **WHEN** 使用者在確認彈窗點擊確認
- **THEN** 系統送出生成請求，扣除預估飼料，並開始追蹤生成進度

#### Scenario: 飼料不足時提示

- **WHEN** 使用者送出生成請求但飼料餘額不足
- **THEN** 系統顯示錯誤訊息，不建立生成任務

#### Scenario: 確認彈窗文字字級與顏色對齊設計稿

- **WHEN** 使用者開啟「確認生成影片」彈窗
- **THEN** 標題、內文與「使用模型／本次消耗／剩餘飼料」三列的標籤、數值文字，字級與顏色皆與 Figma `125:805` 提供的數值一致

#### Scenario: 確認彈窗間距與圓角對齊設計稿

- **WHEN** 使用者開啟「確認生成影片」彈窗
- **THEN** 彈窗圓角、icon 造型、各區塊間的 `gap`、「本次消耗」列內距皆與 Figma `125:805` 提供的數值一致

#### Scenario: 重新生成先確認

- **WHEN** 影片完成後使用者點擊「重新生成」
- **THEN** 系統顯示同一個確認彈窗與目前檔位的飼料數；按「取消」或 Esc 不送出、不扣飼料，按確認才送出

#### Scenario: 任務面板重試先確認

- **WHEN** 使用者在任何頁面打開任務面板，點擊失敗影片的「重試」
- **THEN** 任務面板關閉並顯示同一個確認彈窗（金額為該任務原檔位的單價）；取消時不送出、失敗那筆原樣留在面板，確認時只送出一次，新任務建立後失敗那筆才被取代

### Requirement: 選擇來源圖片、動態模板與輸出比例

系統 SHALL 讓使用者上傳或從圖庫選取來源圖片、選擇一個動態模板、選擇輸出比例。動態模板 SHALL 為鏡頭推移、商品旋轉、文字進場、縮放呼吸四種，送給後端的值依序為 `cameraPan`、`rotate`、`textIn`、`zoomBreath`，預設為鏡頭推移。選圖彈窗 SHALL NOT 列出影片素材。

#### Scenario: 選擇動態模板

- **WHEN** 使用者點擊某個動態模板卡片
- **THEN** 該卡片變為選取狀態，其餘卡片取消選取

#### Scenario: 選圖彈窗不列影片

- **WHEN** 使用者開啟「選擇來源圖片」彈窗，而圖庫裡有影片素材
- **THEN** 彈窗只列出圖片，影片素材不出現

### Requirement: 生成中的背景任務與完成通知

系統 SHALL 讓使用者送出生成請求後可以離開這頁繼續使用其他功能，生成中的任務以背景任務呈現；生成完成後系統 SHALL 通知使用者。影片完成時圖庫若正顯示「全部素材」或「影片」分類，SHALL 重新載入當頁，讓自動入庫的新影片出現。

#### Scenario: 離開頁面後任務持續追蹤

- **WHEN** 使用者送出生成請求後導覽到其他頁面
- **THEN** 該筆生成任務仍持續在背景追蹤進度，不會因為離開頁面而中斷

#### Scenario: 生成完成通知

- **WHEN** 某筆生成任務完成
- **THEN** 系統通知使用者該任務已完成

#### Scenario: 生成失敗不扣飼料

- **WHEN** 某筆生成任務因上游或存檔失敗而失敗
- **THEN** 後端釋放預留、`costFeeds` 為 0，系統通知使用者失敗並說明未扣飼料；內容審核擋下時照實說明飼料照扣

#### Scenario: 在圖庫等影片完成

- **WHEN** 使用者送出後停在圖庫「全部素材」，影片完成
- **THEN** 生成中佔位卡消失，新影片不必手動重新整理就出現在清單中
