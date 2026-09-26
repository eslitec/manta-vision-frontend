## 1. API 層（types、real、mock、useAssets、spec）

- [x] 1.1 對齊 Requirement「AI 修圖提供分項修飾與對比」，落實設計決策「付費管線沿用 runGeneration，冪等鍵認修圖內容」：`src/types/api.ts` 的 `RetouchReq` 加 `imageId`、`RetouchResult` 改繼承 `GeneratedImage` 加 `method/options/cost`、`EditorPricing` 拿掉 `retouchOptions`／`commandBase`；`src/api/real.ts` `postPaid`／`runGeneration` 加選填 `op`、`WireOutput` 加 `costFeeds`、抽出 `firstImage()`（`tryOn` 共用）、新增 `retouchImage`（FormData、`RETOUCH_OPTION_WIRE` 對照、`op` 用修圖內容）並加入 `realApi`。驗證：`real.spec.ts`「POST /edit（AI 修圖）」5 條全綠；「已接上的方法不是 mock 的那一份」多 `retouchImage`
- [x] 1.2 對齊 Requirement「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」的 API 部分，落實設計決策「另存與下載用真結果」：`real.ts`／`mock.ts`／`useAssets.ts` 的 `saveGenerated` 加選填 `folderId`；mock 修圖結果存成 `source: 'edit'`。驗證：`real.spec.ts`「saveGenerated 存修圖結果…」、`mock.spec.ts`「修圖結果存入圖庫標成編輯產物、放進所選資料夾」全綠
- [x] 1.3 落實設計決策「單一價格讀 GET /ai-models?modelType=edit」的 mock 部分：`MOCK_MODELS` 加 `imageEdit`（8）；`retouchImage` 扣該單價、兩者皆空丟 `NOTHING_TO_DO`、回帶圖結果；刪 `EDITOR_PRICING.retouchOptions`／`commandBase`、`COMMAND_RETOUCH_OPTIONS`。驗證：`mock.spec.ts` 修圖相關 5 條全綠

## 2. 修圖頁（ImageEditorWorkspace、LibraryView、i18n）

- [x] 2.1 對齊 Requirement「AI 修圖提供分項修飾與對比」，落實設計決策「單一價格讀 GET /ai-models?modelType=edit」與「分頁二選一照分頁送」：掛載時 `api.listModels('edit')` 取 `imageEdit` 單價（`retouchPrice`）；預估顯示單價或「…」；拿掉 `.option__cost` 與各選項 cost／free；`canStartRetouch` 加「價格已載入」與「快速修飾至少勾一項」；`startRetouch` 送 `imageId`，快速修飾只送項目、指令只送文字。驗證：mock 冒煙 `init_estimate8`、`init_noOptionCost`、`quick_disabledNoneChecked`、`command_disabledEmpty` 通過；真後端頁面載入 `GET /api/ai-models?modelType=edit 200`、預估 8 顆
- [x] 2.2 對齊 Requirement「AI 修圖提供分項修飾與對比」，落實設計決策「結果與等待狀態」：`retouchResult` 取代 `lastRetouchCost/Keys/Method`；「修圖後」顯示結果圖、消耗讀 `result.cost`、結果區按鈕與已套用標籤只在有結果時顯示；刪 9 秒假進度改不定進度條；修圖中停用按鈕與「從圖庫選擇」；`onBeforeRouteLeave`＋`beforeunload`＋`defineExpose({ retouching })`，`LibraryView.selectTab` 切回素材庫先確認；錯誤用 `displayMessage`、`finally` 刷新飼料；換素材清掉結果。驗證：mock 冒煙 `*_startDisabledWhileRunning`、`*_noEtaText`、`*_deducted8`、`tabLeave_confirmAsked`／`tabLeave_stayed`／`tabLeave_noConfirmWhenIdle` 通過
- [x] 2.3 對齊 Requirement「AI 修圖提供分項修飾與對比」，落實設計決策「重新修圖＝上一次條件再送一次」與「另存與下載用真結果」：「重新修圖」送 `lastRetouchReq`、按鈕帶單價；「下載」走 `downloadFile`＋未採用才 `recordAdoption`。驗證：mock 冒煙 `again_deducted8`、`again_newResult`、`*_downloadNoError` 通過
- [x] 2.4 對齊 Requirement「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」：`saveAsNewAsset` 在修圖頁走 `saveGenerated(name, 結果, folder)`（`ALREADY_SAVED` 當已存入、標 `adopted`、勾「同時下載」走 `downloadRetouch`），拿掉 `props.mode !== 'retouch'` 的 mock 守衛；錯誤訊息改顯示後端訊息；savedAssetId 的重設不再看修圖設定，改在新結果出來時重設。驗證：mock 冒煙 `*_saved`、`picker_hasBothSaves`（選圖彈窗查得到兩張另存）通過
- [x] 2.5 i18n 兩語系同步：刪 `editor.free`、`editor.feedShort`、`editor.retouch.commandBaseCost`／`commandBaseCostHint`／`stepLabel`／`timeRemaining`；改 `editor.saveHint`、`editor.retouch.again`、`editor.retouch.options.upscale.hint`。驗證：兩語系 key 差異與改動前相同（zh-Hant 獨有 8 個既有 `editor.retouch.*`、en 獨有 0）

## 3. 驗證

- [x] 3.1 `npx vitest run` 0 failed（基準 256 → 263）；`npx vue-tsc --noEmit`（TS2448／TS2454 為 0）、`npm run lint` exit 0；`npx prettier --check` 改動檔通過
- [x] 3.2 先讓它紅：`cp src/api/real.ts` 到 scratchpad `snap/`，逐項改壞後跑 `real.spec.ts -t "POST /edit|saveGenerated"`——`op` 不傳（冪等鍵測試紅）、options 不對照（快速修飾測試紅）、`/save` 用 `from.id`（三條 saveGenerated 紅）、不送 `folderId`（修圖存入測試紅）、202 不輪詢（202 測試紅）；每項 `cp` 還原後全綠
- [x] 3.3 `spectra validate retouch-real-backend`、`spectra analyze retouch-real-backend`：valid 且 Coverage／Consistency／Gaps 無發現
- [x] 3.4 mock 冒煙（`VITE_USE_MOCK= npx vite --port 5179 --strictPort`，puppeteer-core＋系統 Chrome headless，`browser.close()` 在 `finally`）：快速修飾與指令修圖各一次 → 修圖後出現圖、扣 8、另存進 mock 圖庫、下載無錯；截圖在 scratchpad `retouch/mock/`
- [x] 3.5 真後端（免費部分）冒煙（`VITE_USE_MOCK=false … --port 5178`，瀏覽器端攔截所有付費 POST）：`GET /ai-models?modelType=edit` 200、預估 8 顆、選素材後「開始修圖」可按；不按開始修圖、付費請求 0 筆
- [ ] 3.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive retouch-real-backend`（先歸檔 `editor-object-layers`）
