## 1. store 與型別

- [x] 1.1 對齊 Requirement「AI 試穿生成列入任務中心」與 Requirement「AI 修圖生成列入任務中心」與設計決策「一個 trackTask 包住所有「頁面自己 await」的生成」：`src/stores/generationTasks.ts` 新增 `trackTask(kind, name, cost, run, errorText)`，`createImageTask` 移除、`createMarketingTask` 改為每一半呼叫一次 `trackTask`；`src/types/api.ts` 的 `GenerationTaskKind` 新增 `tryon`、`retouch` 並移除無讀取端的 `resultImages`；`GenerateImageView.vue` 兩處改呼叫 `trackTask('image', …)`。驗證：`npx vitest run` 全綠（新增「AI 試穿：送出時進行中…」「AI 修圖失敗：…」兩條），行銷四條既有測試不改仍綠；把 `trackTask` 的 `errorText(e)` 拿掉時 4 條轉紅、把行銷一半的 `partialError` 判定拿掉時 1 條轉紅。

## 2. 頁面與面板

- [x] 2.1 對齊 Requirement「AI 試穿生成列入任務中心」與設計決策「失敗訊息由頁面傳入，面板不顯示重試鈕」：`TryOnView.vue` 的 `onGenerate` 把 `api.tryOn(...)` 原樣包進 `tasksStore.trackTask('tryon', t('tryOn.taskName', …), 單價, run, failText)`，同意檢查仍在送出前、`CONSENT_REQUIRED` 仍開同意視窗；驗證：mock 冒煙試穿「未同意不記任務」「進行中→完成」「失敗同一句、無重試鈕」，真後端試穿一次扣 12 顆、`POST /tryon` 一次帶 Idempotency-Key、結果按「存入圖庫」前圖庫無 `source=tryon`、按後多一張。
- [x] 2.2 對齊 Requirement「AI 修圖生成列入任務中心」與設計決策「失敗訊息由頁面傳入，面板不顯示重試鈕」：`ImageEditorWorkspace.vue` 的 `runRetouch`（開始修圖與重新修圖共用）把 `api.retouchImage(req)` 原樣包進 `tasksStore.trackTask('retouch', t('editor.retouch.taskName', …), 單價, run, retouchFailText)`，換圖保護與修圖中切分頁確認不動；驗證：mock 冒煙快速修飾、指令修圖、重新修圖各一筆完成、修圖中切回素材庫仍會確認、飼料不足失敗同一句且無重試鈕；真後端修圖一次扣 8 顆、`POST /edit` 一次帶 Idempotency-Key、按「另存為新素材」前圖庫無 `source=edit`、按後多一張且 `derived_from` 指回原圖。
- [x] 2.3 對齊 Requirement「AI 試穿生成列入任務中心」與 Requirement「AI 修圖生成列入任務中心」與設計決策「完成說明照後端行為寫，不說「已存入圖庫」」：`TaskCenterPanel.vue` 完成狀態改為影片用 `taskCenter.completed`、其餘取 `taskCenter.<kind>Completed`；`zh-Hant.ts`／`en.ts` 補 `tryOn.taskName`、`editor.retouch.taskName`、`taskCenter.tryonCompleted`、`taskCenter.retouchCompleted`，`taskCenter.notePrimary` 改為「其他生成請留在頁面上等結果」；驗證：i18n 兩語系 key 差異與基準相同（zh-Hant 多 8 個既有 `editor.retouch.*`、en 多 0）。

## 3. 驗收

- [x] 3.1 mock 冒煙（puppeteer 真滑鼠）`a1-smoke.cjs`：試穿、快速修飾、指令修圖、重新修圖、兩種失敗，以及行銷、圖生圖、影片任務；同一支腳本在 05867b3 上 FAIL 12／20、改動後 20／20 PASS。
- [x] 3.2 `npx vitest run`（291 passed）、`npx vue-tsc --noEmit`、`npm run lint`、`npx prettier --check <改動檔>` 全數通過。
