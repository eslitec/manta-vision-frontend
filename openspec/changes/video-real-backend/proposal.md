## Why

使用者回報：「影片還無法生成」。前端 `src/api/real.ts` 的 `realApi = { ...mockApi, …覆寫 }` 沒有覆寫 `createVideoJob`／`getVideoJob`，真後端模式下圖生影**靜默走假後端**（扣 mock 的假餘額、5 秒假完成）；後端 `app/routers/video.py` 也只是空殼。後端 #21 `POST /video`、#22 `GET /video/{taskId}`、#23 `GET /video` 已在後端分支 `feat/video` 實作完成，前端要接上。

排查時一併發現：請求欄位與契約對不上（`modelTier`→`modelKey`、四個模板值全錯、沒送 `taskName`、沒選來源圖也能送出）；價格寫死 45×倍率；輪詢每秒一次且沒有錯誤處理（404／401 會變成每秒一次的未處理錯誤，計時器永不停）；完成後不能播放、下載是空函式；重新整理後任務中心全空（後端卻還在跑、會扣點），使用者容易以為沒送出而再按一次；登出不清任務與計時器；選圖彈窗會列出影片素材；任務面板頁尾寫「生成失敗不退還飼料」，與後端「失敗釋放預留」相反。

## What Changes

- `realApi` 新增 `createVideoJob`（走付費管線 `postPaid`：Idempotency-Key、100 秒逾時、只在不確定送達時重送；202 即完整答案，不走 `runGeneration` 的 `/generations` 輪詢）、`getVideoJob`、`listVideoJobs`（`GET /video?limit=10`）；回應翻成前端 `VideoJob`（`taskId`→`id`、`costFeeds`→`cost`、`failReason`→`error`）。
- 型別：`VideoJobReq` 改為契約欄位（`sourceImageId` 必填、`modelKey`、`template` 四個契約值、`ratio`、`taskName`）；刪除寫死倍率的 `VIDEO_MODEL_TIERS`；`VideoJob`／`GenerationTask` 補 `etaSeconds`、`resultUrl`、`durationMs`。
- store：輪詢改 3 秒；斷線／逾時／5xx 下一輪再問，其他錯誤停止並標失敗；每輪更新進度、剩餘時間、扣點額（預扣→實扣／失敗為 0）；完成或失敗後刷新飼料餘額；`failReason` 翻成文案；新增 `restoreVideoTasks`（進入已登入畫面時還原並續輪詢）與 `reset`（登出時清空）。
- 圖生影頁：模板改契約值；三檔價格讀 `GET /ai-models?modelType=video`；沒選來源圖、價格未載入或送出中停用「生成影片」；錯誤顯示後端訊息（402 用既有文案）；完成後播放 `resultUrl`、下載存成「任務名.mp4」；剩餘時間與耗時改用後端值。
- 任務面板剩餘時間用後端 `etaSeconds`；還原的任務沒有原始參數，不顯示按了沒作用的「重試」。
- 選圖彈窗不列影片素材；圖庫在影片完成時重抓當頁。
- i18n：模板鍵改契約值、新增 `video.failReasons.*`、頁尾政策改為「生成失敗不扣飼料（內容審核擋下除外）」、`video.modelHint` 改讀實價。
- 「重新生成」與面板「重試」維持現行流程（是否加二次確認待使用者決定）。

## Capabilities

### Modified Capabilities

- `generate-video-ui`: 新增「圖生影生成走真後端」「影片進度輪詢與結果呈現」「重新整理後還原影片任務」「影片檔位與價格讀自後端」；修改「選擇來源圖片、動態模板與輸出比例」「生成中的背景任務與完成通知」。

## Impact

- Affected specs: `generate-video-ui`
- Affected code:
  - Modified:
    - src/api/real.ts
    - src/api/real.spec.ts
    - src/api/mock.ts
    - src/api/mock.spec.ts
    - src/types/api.ts
    - src/stores/generationTasks.ts
    - src/stores/session.ts
    - src/stores/stores.spec.ts
    - src/views/GenerateVideoView.vue
    - src/components/TaskCenterPanel.vue
    - src/layouts/DefaultLayout.vue
    - src/views/LibraryView.vue
    - src/utils/imagePicker.ts
    - src/utils/imagePicker.spec.ts
    - src/lang/zh-Hant.ts
    - src/lang/en.ts
- 後端依賴：`manta-vision-backend` 分支 `feat/video`（含 migration `20260929_video_tasks`）合併並 `alembic upgrade head` 之後，真後端才有這三支端點。
