## 1. store 與型別

- [x] 1.1 對齊 Requirement「行銷 PO 文生成列入任務中心」與設計決策「「文案＋配圖」一半記一筆任務」：`src/types/api.ts` 的 `GenerationTaskKind` 新增 `marketingImage`、`marketingText`；`src/stores/generationTasks.ts` 新增 `createMarketingTask(run, halves, errorText)`，一半一筆任務、`run()` 回來後依 `poster`／`copy` 判定每一半成敗；驗證：`npx vitest run src/stores/stores.spec.ts` 的「文案＋配圖記成兩筆」「只要文案／只要配圖」測試綠燈。
- [x] 1.2 對齊 Requirement「行銷任務失敗顯示原因且不提供面板重試」與設計決策「失敗訊息由頁面傳入，面板不顯示重試鈕」：`createMarketingTask` 在 `run()` 丟錯時每筆標失敗並帶 `errorText(e)`、只成功一半時失敗那筆帶 `errorText(partialError)`，錯誤照樣丟回頁面；驗證：store 測試「只成功一半」「全部失敗」綠燈。
- [x] 1.3 對齊 Requirement「圖生圖任務狀態即時反映在任務中心」與設計決策「圖生圖與行銷共用 addTask／finish，改 reactive proxy」：抽出 `addTask`（回傳 `tasks.value[0]` 的 reactive proxy）與 `finish`，`createImageTask` 改用它們；驗證：store 測試「圖生圖完成後未讀徽章會更新」綠燈，且把 `addTask` 改回回傳原物件時該測試轉紅。

## 2. 頁面與面板

- [x] 2.1 對齊 Requirement「行銷 PO 文生成列入任務中心」：`MarketingPostView.vue` 的 `generate()` 改為 `tasksStore.createMarketingTask(() => api.generatePost({…原樣…}), taskHalves(sentType), failText)`，`taskHalves` 依本次送出的輸出類型產生名稱與單價；驗證：真後端「文案＋配圖」一次，兩支端點各 POST 一次、各帶一把 Idempotency-Key，扣點 5，結果可存入圖庫。
- [x] 2.2 對齊 Requirement「行銷 PO 文生成列入任務中心」：`TaskCenterPanel.vue` 完成狀態對行銷任務顯示 `taskCenter.marketingImageCompleted`／`marketingTextCompleted`；`zh-Hant.ts`／`en.ts` 補 `marketing.taskName.*`、兩個完成文案，並把 `taskCenter.notePrimary` 改為涵蓋行銷 PO 文；驗證：i18n 兩語系 key 差異與基準相同。
- [x] 2.3 對齊 Requirement「行銷任務失敗顯示原因且不提供面板重試」與設計決策「失敗訊息由頁面傳入，面板不顯示重試鈕」：`TaskCenterPanel.vue` 的重試鈕排除 `marketingImage`／`marketingText`；驗證：mock 冒煙「失敗」「只成功一半」兩步，面板顯示錯誤訊息且沒有重試鈕。

## 3. 驗收

- [x] 3.1 mock 冒煙（puppeteer 真滑鼠）：三種輸出類型、整次失敗、只成功一半、圖生圖與影片任務；同一支腳本在 bf213e7 上 FAIL、改動後全 PASS。
- [x] 3.2 `npx vitest run`、`npx vue-tsc --noEmit`、`npm run lint`、`npx prettier --check <改動檔>` 全數通過。

## 4. 審查後續

- [x] 4.1 對齊 Requirement「圖生圖任務狀態即時反映在任務中心」：`createImageTask` 新增選填 `errorText`，`GenerateImageView` 兩處呼叫傳入與頁面相同的 `failText`，失敗任務不再固定顯示「生成失敗・模型逾時」；面板「重試」鈕只給影片任務（`retryTask` 只處理影片，原本圖生圖失敗會出現按了沒反應的重試鈕）；`.task__meta` 由單行截斷改為最多兩行並在失敗說明加 `title`，行銷完成文案的「請在行銷頁按存入圖庫」不再被截掉。驗證：新增 vitest 1 條，拿掉錯誤傳遞時紅、還原綠；`npx vitest run` 289 passed；mock 冒煙 `a1-smoke.cjs` 9/9 PASS 並目視截圖兩行顯示；`vue-tsc`／`lint`／prettier 通過
