## Context

圖生影是全站唯一的非同步生成（後端 `app/routers/video.py`、`app/services/video_queue.py`，分支 `feat/video`）：`POST /video` 預留點數、建任務、立刻回 202 `{taskId, status, costFeeds, balance}`；背景送上游並輪詢，`GET /video/{taskId}` 純讀 DB 回 `{taskId, taskName, status, progress, etaSeconds, step, resultUrl, failReason, costFeeds, durationMs}`（欄位一律帶齊，不適用為 null）；`GET /video` 回這隻機器人最近的任務（`unread` 恆 0）。前端的任務中心與頂部徽章都讀 `useGenerationTasksStore`，影片任務由 store 輪詢、不綁頁面生命週期。

契約以後端程式碼為準（`app/schemas/video.py`），與 v13 文字的差異已寫進後端 `docs/api/v14.md` 就地補正（五）：`failReason` 只有 `upstreamError`／`storageError`／`contentBlocked`；審核擋下 `costFeeds` 為實扣額；來源圖是影片或裁切後太小回 400。

## Goals / Non-Goals

**Goals:**

- 真後端模式下圖生影真的打 #21／#22／#23，請求欄位與後端 schema 一致。
- 任務進度、剩餘時間、扣點、失敗原因都用後端的值；完成可播放、可下載。
- 重新整理後看得到還在跑的影片，不會因為以為沒送出而再扣一次。

**Non-Goals:**

- 不改「重新生成」與面板「重試」的流程（是否加二次確認待使用者決定）。
- 不做後端的已讀狀態（擱置區 #9 定案已讀在前端本地）。
- 不改圖庫卡片的影片縮圖／播放（卡片仍顯示影片圖示）。

## Decisions

### POST /video 走 postPaid，不走 runGeneration

`runGeneration` 看到 202 會去輪詢 `/generations/{id}`，影片沒有那支。`postPaid` 已處理 Idempotency-Key（同輸入結果不確定時沿用）、100 秒逾時、只在不確定送達時重送；後端對 #21 的 202 寫 24 小時冪等快照，重送回同一個 taskId、不會再預留。202 是 2xx，`postPaid` 會釋放那把 key，下次按是真的再生成一次。

### 輪詢 3 秒、錯誤分兩類

契約建議 3 秒。`GET` 冪等：斷線、逾時、5xx（部署中、代理吐的 502）等下一輪再問；其他錯誤（404 任務不見、401／403）結果已確定，停止並標失敗，顯示後端訊息（401 另由 session 攔截器登出並 `reset`）。每輪同步 `status`／`progress`／`etaSeconds`／`costFeeds`／`resultUrl`／`durationMs`；回應回來前計時器已被清掉（收尾或登出）就丟棄結果，避免重複收尾。同一個任務只允許一份計時器。

### 還原任務用 #23，已讀留在前端

`DefaultLayout` 掛載（登入後、重新整理後）呼叫 `restoreVideoTasks`：`GET /video?limit=10`，已在清單的 id 跳過，其餘接在清單後面、一律當已讀（已讀只存在記憶體，重新整理前完成的不再亮紅點），進行中的續輪詢。#23 不回原始請求參數，所以還原的任務沒有 `videoReq`，面板不顯示重試鈕。失敗只記 console，不擋畫面。登出（含 token 失效）在 `session.discard()` 呼叫 `reset`：清計時器、清任務、清 toast；`reset` 之前發出、之後才回來的還原結果不採用（那是上一個帳號的任務）。

### 價格與檔位讀後端，比照圖生圖頁

三檔 `videoStandard`／`videoAdvanced`／`videoPro` 對 i18n 的 `modelTiers.*`；單價讀 `GET /ai-models?modelType=video`，倍率＝單價 ÷ 標準檔單價，後端沒回的檔不顯示，預設檔被停用改選第一張卡；價格未載入時「生成影片」停用。

### 失敗文案依 failReason

`video.failReasons.{upstreamError|storageError|contentBlocked}`：前兩者後端會釋放預留（未扣飼料），審核擋下照扣；不認得的代碼只顯示「生成失敗」，不猜原因。頁面預覽區與任務面板用同一句。

## Risks / Trade-offs

- [進度是後端估算（已耗時 ÷ 該檔平均耗時，封頂 95），平均耗時是暫定值] → 前端照實顯示，不自行累加；後端依實測調整。
- [還原只取最近 10 筆，沒有分頁] → 契約如此；任務面板本來就只看近期任務。
- [mock 沒有影片檔] → mock 的 `resultUrl` 留空、下載跳過；播放與下載以真後端＋瀏覽器端攔截的 e2e 驗證。
