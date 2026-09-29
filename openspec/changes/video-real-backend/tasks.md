## 1. API 層

- [x] 1.1 對齊 Requirement「圖生影生成走真後端」與設計決策「POST /video 走 postPaid，不走 runGeneration」：`src/types/api.ts` 的 `VideoJobReq` 改為契約欄位（`sourceImageId` 必填、`modelKey`、`template`、`ratio`、`taskName`），刪除 `VideoModelTier`／`VIDEO_MODEL_TIERS`；`src/api/real.ts` 新增 `createVideoJob`（`postPaid('/video', req)`）、`getVideoJob`、`listVideoJobs` 並加進 `realApi`；驗證：`npx vitest run src/api/real.spec.ts` 的圖生影測試與「已接上的方法不是 mock 的那一份」綠燈，從 `realApi` 拿掉 `createVideoJob` 時轉紅。
- [x] 1.2 對齊 Requirement「影片檔位與價格讀自後端」：`src/api/mock.ts` 的 `MOCK_MODELS` 補 `videoStandard` 45／`videoAdvanced` 90／`videoPro` 180，`createVideoJob` 依 `modelKey` 扣價、記任務名，`getVideoJob` 失敗碼改 `upstreamError` 並退回預扣、done 自動入庫一次，新增 `listVideoJobs`；驗證：`npx vitest run src/api/mock.spec.ts` 綠燈。

## 2. store

- [x] 2.1 對齊 Requirement「影片進度輪詢與結果呈現」與設計決策「輪詢 3 秒、錯誤分兩類」：`src/stores/generationTasks.ts` 的 `poll` 改 3 秒、斷線／逾時／5xx 下一輪再問、其他錯誤停止並標失敗、每輪同步進度／剩餘時間／扣點／結果網址／耗時、完成或失敗後刷新餘額、`failReason` 翻文案；`createVideoTask` 送出 `taskName`；驗證：`npx vitest run src/stores/stores.spec.ts` 的輪詢測試綠燈，把間隔改回 1000 或把 404 當成可重試時轉紅。
- [x] 2.2 對齊 Requirement「重新整理後還原影片任務」與設計決策「還原任務用 #23，已讀留在前端」：新增 `restoreVideoTasks` 與 `reset`，`src/stores/session.ts` 的 `discard()` 呼叫 `reset`；驗證：store 測試「併入不重複」「登出清空並停止輪詢」「回來前已登出不併入」綠燈，拿掉跳過已存在 id、拿掉 `reset` 呼叫或拿掉登出守衛時轉紅。

## 3. 頁面與面板

- [x] 3.1 對齊 Requirement「圖生影生成走真後端」「影片檔位與價格讀自後端」與設計決策「價格與檔位讀後端，比照圖生圖頁」：`GenerateVideoView.vue` 模板改契約值、價格讀 `listModels('video')`、沒選圖／價格未載入／送出中停用生成鈕、錯誤顯示後端訊息、送出後刷新餘額；驗證：真後端 e2e「三張卡 45／90／180」「沒選圖停用」「恰一發 POST、body 為契約欄位」「402 顯示飼料不足」通過。
- [x] 3.2 對齊 Requirement「影片進度輪詢與結果呈現」與設計決策「失敗文案依 failReason」：預覽區在 done 播放 `resultUrl`、下載存成「任務名.mp4」、剩餘時間與耗時用後端值、失敗顯示原因；`TaskCenterPanel.vue` 剩餘時間用 `etaSeconds`；驗證：真後端 e2e「video src 為 resultUrl 且可播放」「下載存下該影片」「上游失敗預覽區與面板同一句原因」通過。
- [x] 3.3 對齊 Requirement「重新整理後還原影片任務」：`DefaultLayout.vue` 掛載時呼叫 `restoreVideoTasks`；面板對沒有 `videoReq` 的任務不顯示重試；驗證：真後端 e2e「重新整理後任務中心出現還原測試並持續輪詢」通過。
- [x] 3.4 對齊 Requirement「影片進度輪詢與結果呈現」：`GenerateVideoView.vue` 的 `etaText` 與 `TaskCenterPanel.vue` 的 `remainingTime` 在剩餘秒數 ≤ 0 時改顯示 `common.takingLonger`（兩語系新增）；驗證：真後端 e2e「ETA=0：頁面／面板不顯示約剩 0 秒、改顯示比預期久」通過，在改動前的檔案上 FAIL。

## 4. 其他

- [x] 4.1 對齊 Requirement「選擇來源圖片、動態模板與輸出比例」：`src/utils/imagePicker.ts` 的 `isListedInPicker` 不列影片；驗證：`npx vitest run src/utils/imagePicker.spec.ts` 綠燈、拿掉該行轉紅；mock 冒煙彈窗不含「夏季宣傳_短影片」。
- [x] 4.2 對齊 Requirement「生成中的背景任務與完成通知」：`LibraryView.vue` 在影片輪詢到完成時，若顯示「全部素材」或「影片」分類就重抓當頁；`src/lang/zh-Hant.ts`／`en.ts` 模板鍵改契約值、新增 `video.failReasons.*`、`taskCenter.notePolicy` 改為生成失敗不扣飼料（內容審核擋下除外）、`video.modelHint` 讀實價；驗證：mock 冒煙「完成後圖庫自動出現新影片」通過，i18n 兩語系 key 差異與基準相同。

## 5. 驗證

- [x] 5.1 `npx vitest run`、`npx vue-tsc --noEmit`（無 TS2448／TS2454）、`npm run lint`、`npx prettier --check <改動檔>` 全數通過。
- [x] 5.2 真後端（VITE_USE_MOCK=false）＋瀏覽器端攔截 `/api/video*` 的 e2e 全 PASS、付費請求放行 0 筆；同一支腳本在 05867b3 的非 git 複本上 FAIL。

## 6. 待決與歸檔

- [ ] 6.1 待使用者決定重做是否二次確認：「重新生成」與任務面板「重試」目前不經確認視窗直接送出（沿用現行行為）；若要加確認，改 Requirement「送出生成前二次確認」並讓兩個入口走同一個確認視窗。
- [ ] 6.2 後端 `feat/video` 合併並 `alembic upgrade head` 後，指揮官做真實付費實測（進度條平均耗時、播放、下載、失敗退點）。
- [ ] 6.3 PR 合併後 `spectra archive video-real-backend`。
