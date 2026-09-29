## Why

使用者看到「AI 試穿和 AI 修圖目前也不會出現在任務面板」後要求修正。右上角「任務」面板（`TaskCenterPanel.vue`）只讀前端 store `src/stores/generationTasks.ts`，圖生圖、行銷 PO 文、圖生影會寫入；`TryOnView.vue` 的 `onGenerate` 直接呼叫 `api.tryOn`、`ImageEditorWorkspace.vue` 的 `runRetouch` 直接呼叫 `api.retouchImage`，所以 AI 試穿與 AI 修圖（快速修飾、指令修圖、重新修圖）從未進過任務面板，也不會亮任務徽章。

## What Changes

- store 新增共用的 `trackTask(kind, name, cost, run, errorText)`：記一筆任務、呼叫頁面原本的 API、依成敗轉為完成或失敗，結果與錯誤原樣交還頁面。圖生圖改用它（取代 `createImageTask`），行銷的 `createMarketingTask` 改為每一半各呼叫一次 `trackTask`，不再各自複製一份「記任務＋收尾」的邏輯。
- AI 試穿送出後記一筆「AI 試穿_<服飾名前 12 字>」任務；AI 修圖（開始修圖與重新修圖）記一筆「AI 修圖_<素材名前 12 字>」任務。API 請求內容、Idempotency-Key、扣點、202 輪詢、結果顯示、存入圖庫／另存為新素材、下載、修圖的「結果不配錯圖」保護與修圖中切分頁確認全部不動。
- 完成說明照實講：兩者的結果都**不會**自動存入圖庫（後端只有 `POST /generations/{id}/save` 才建立圖庫素材），試穿要回 AI 試穿頁按「存入圖庫」、修圖要在圖庫「AI 修圖」分頁按「另存為新素材」。
- 失敗時面板顯示與頁面同一句錯誤；這兩類任務不提供面板重試（結果只活在各自頁面），比照行銷。
- 面板完成說明改為「影片用通用文案、其餘依任務類型取 `taskCenter.<kind>Completed`」；頁尾說明改為「其他生成請留在頁面上等結果」。
- `GenerationTaskKind` 新增 `tryon`、`retouch`；移除沒有任何讀取端的 `GenerationTask.resultImages`。
- 新字串同步補 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts`。

## Capabilities

### Modified Capabilities

- `tryon-ui`: 新增「AI 試穿生成列入任務中心」需求。
- `image-editor-ui`: 新增「AI 修圖生成列入任務中心」需求。

## Impact

- Affected specs: `tryon-ui`、`image-editor-ui`
- Affected code:
  - Modified:
    - src/stores/generationTasks.ts
    - src/stores/stores.spec.ts
    - src/views/TryOnView.vue
    - src/components/ImageEditorWorkspace.vue
    - src/views/GenerateImageView.vue
    - src/components/TaskCenterPanel.vue
    - src/types/api.ts
    - src/lang/zh-Hant.ts
    - src/lang/en.ts
