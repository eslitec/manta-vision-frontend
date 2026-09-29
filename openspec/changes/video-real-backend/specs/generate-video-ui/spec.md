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
