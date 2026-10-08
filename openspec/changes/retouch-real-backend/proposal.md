## Why

使用者回報「指令修圖沒有 work」。根因：真後端模式下 `realApi` 是 `{ ...mockApi, ... }`，沒有覆寫 `retouchImage`，AI 修圖頁按「開始修圖」只跑 mock（900ms、扣 mock 假餘額、回傳沒有圖），`POST /edit` 從沒被呼叫（本機後端 72 小時內 0 筆 `/edit`、`generation_logs type='edit'` 0 筆）；`RetouchReq` 也沒有 `imageId`。畫面上的價格（各選項 8/8/0/5、指令基本費 16）、9 秒一步的假進度、永遠是佔位圖的「修圖後」、沒有處理函式的「下載」、走 mock 的「另存」都是假的。後端 `POST /edit`（`app/schemas/edit.py`、`app/routers/generation.py`）早已就緒：multipart、`imageId` 必填、`prompt`／`options` 至少一個、每次固定扣 `imageEdit` 單價（8）、200／202 與圖生圖同一條付費管線。

## What Changes

- `src/api/real.ts`：新增 `retouchImage(req)` → `POST /edit`（multipart：`imageId`、`prompt`、`options` 逐項 append；前端項目 `removeObjects/repair/lighting/upscale` 對照後端 `removeObject/fixFlaw/lightFix/upscale2x`；不送 `mask`），走既有 `runGeneration`（`Idempotency-Key`、100 秒逾時、202 輪詢）；`postPaid`／`runGeneration` 加選填 `op`（FormData 經 `JSON.stringify` 恆為 `"{}"`，改用修圖內容當「同一份輸入」的鍵）；`WireOutput` 加 `costFeeds`；抽出 `firstImage()`（`tryOn` 共用）；`saveGenerated` 加選填 `folderId`；`realApi` 加 `retouchImage`
- `src/types/api.ts`：`RetouchReq` 加 `imageId`；`RetouchResult` 改為 `GeneratedImage` 加 `method/options/cost`；`EditorPricing` 拿掉 `retouchOptions`／`commandBase`
- `src/api/mock.ts` 同形：`MOCK_MODELS` 加 `imageEdit`（8）；`retouchImage` 扣 `imageEdit` 單價、兩者皆空丟 `NOTHING_TO_DO`、回帶 picsum 圖的結果；`saveGenerated` 收 `folderId`、修圖結果存成 `source: 'edit'`；刪 `EDITOR_PRICING.retouchOptions`／`commandBase`／`COMMAND_RETOUCH_OPTIONS`
- `src/composables/useAssets.ts`：`saveGenerated` 轉發 `folderId`
- `src/components/ImageEditorWorkspace.vue`（修圖頁）：價格讀 `api.listModels('edit')` 的 `imageEdit`、拿掉各選項加價顯示；送出帶 `imageId`，分頁二選一（快速修飾只送項目、指令只送文字）；「修圖後」顯示結果圖、消耗讀後端 `costFeeds`、沒有結果前不顯示消耗／已套用／結果按鈕；假進度換成不定進度；修圖中停用按鈕、`onBeforeRouteLeave`＋`beforeunload` 離開確認；「重新修圖」以上一次條件再送（按鈕標價）；「下載」走 `downloadFile`＋`recordAdoption`；「另存」改走 `saveGenerated(name, 結果, folder)`（`ALREADY_SAVED` 當已存入），拿掉「修圖頁另存維持 mock」守衛；錯誤顯示後端訊息、結束後 `feed.refresh()`
- `src/views/LibraryView.vue`：修圖中切回「素材庫」分頁（會卸載編輯器）先確認
- i18n（兩語系同步）：刪 `editor.free`、`editor.feedShort`、`editor.retouch.commandBaseCost`／`commandBaseCostHint`／`stepLabel`／`timeRemaining`；改 `editor.saveHint`（加 24 小時暫存）、`editor.retouch.again`（帶單價）、`editor.retouch.options.upscale.hint`（後端只加一句提示詞，不保證 2160px）
- 測試：`real.spec.ts` 補 `/edit` 請求形狀、202 輪詢、冪等鍵認內容、空結果、`saveGenerated` 帶資料夾；`mock.spec.ts` 對齊單一價格

## Non-Goals

- 不做遮罩／局部重繪（後端目前模型沒有 `mask_field`，帶了一律 400）、不加品牌開關（`useBrand` 不送＝false）、不進任務中心
- 不改修圖頁其他既有文案與版面（「或拖曳上傳」無功能、原圖下方寫死的上傳日期、en 缺的 8 個 `editor.retouch.*` key）
- 不改後端；後端 `docs/api-status.md` 過期敘述、mask 超過 10MB 回 500 等後端問題不在本 change

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `image-editor-ui`：AI 修圖接真後端 `POST /edit`（單一價格、結果圖、不定進度、離開確認、重新修圖再扣點、下載記採用）；修圖頁「另存為新素材」改存修圖結果（取代 `editor-object-layers` 的「AI 修圖頁另存維持 mock」）

## Impact

- Affected specs: image-editor-ui
- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue、src/views/LibraryView.vue、src/api/real.ts、src/api/mock.ts、src/types/api.ts、src/composables/useAssets.ts、src/lang/zh-Hant.ts、src/lang/en.ts、src/api/real.spec.ts、src/api/mock.spec.ts
  - Removed: (none)
- 後端依賴：manta-vision-backend `feat/generate-count-1-4`（docker :8000，含 `/edit`）；後端一行都不改
- 歸檔順序：`editor-object-layers` 之後（本 change 的「非破壞編輯…」MODIFIED 以它的版本為底，只改修圖頁另存那一句與對應 Scenario）
