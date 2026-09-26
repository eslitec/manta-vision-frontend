## Context

修圖頁（`ImageEditorWorkspace.vue` 的 `mode === 'retouch'` 分支）一直跑 mock：`realApi` 沒覆寫 `retouchImage`。後端 `POST /edit` 契約（`manta-vision-backend` `app/schemas/edit.py:35-58`、`app/routers/generation.py:271-322`、`app/services/generation.py:841-892`）：multipart；`imageId`（本 bot 的 images，內建素材 404）必填；`prompt` 選填；`options` 白名單 `removeObject/fixFlaw/lightFix/upscale2x`、同一個 key 重複送；兩者皆空 400 `NOTHING_TO_DO`；`mask` 目前一律 400；固定模型 `imageEdit`、每次扣 `cost_per_gen`（8），options 不加價；200 回 `results[0]`＋`costFeeds`，逾時 202 後輪詢 `GET /generations/{id}`；存入走 `POST /generations/{id}/save`（type=edit → `source=edit`、`derived_from` 指回原圖）。

## Goals / Non-Goals

**Goals:** 修圖真的打 `/edit`、顯示結果圖、價格與扣點以後端為準、下載／另存用真結果、等待與錯誤行為同圖生圖頁。

**Non-Goals:** 遮罩、品牌開關、任務中心、修圖頁其他既有文案（見 proposal）。

## Decisions

### 付費管線沿用 runGeneration，冪等鍵認修圖內容

`retouchImage` 組 FormData 後交給既有 `runGeneration`（`postPaid` 的 key 重用、100 秒逾時、409／暫時性錯誤重送、202 輪詢）。`postPaid` 原本用 `url + JSON.stringify(body)` 辨識「同一份輸入」，FormData 會變成 `"{}"`——所有修圖共用一把前端 key，修圖 B 成功會刪掉修圖 A 還懸著的 key。改成 `postPaid(url, body, op = url + JSON.stringify(body))`，修圖傳 `'/edit' + JSON.stringify({ imageId, prompt, options })`；其他呼叫端不變。重送沿用同一個 FormData 物件（後端逐 part 算指紋，boundary 不影響）。

### 分頁二選一照分頁送

後端 prompt 與 options 可同時送，但 UI 是二選一分頁：快速修飾只送勾選項目、指令修圖只送文字（切分頁時殘留的另一邊輸入不送）。快速修飾一項都沒勾時停用送出（否則後端 400 `NOTHING_TO_DO`）。

### 單一價格讀 GET /ai-models?modelType=edit

取 `modelKey === 'imageEdit'` 的 `costFeeds`；載入前預估顯示「…」、送出與重新修圖停用；清單裡沒有（被停用）或請求失敗時顯示 `errors.loadFailed`／後端訊息。拿掉各選項的加價標籤與 `EditorPricing` 的修圖欄位（背景移除仍用 `getEditorPricing().tools`）。實際扣點顯示後端回的 `costFeeds`。

### 結果與等待狀態

`RetouchResult` 繼承 `GeneratedImage`（`id/generationId/url/adopted`），可直接給 `saveGenerated`／`recordAdoption`／`downloadFile`。進度改不定進度（後端同步最長約 80 秒、202 後最長輪詢 11 分鐘，猜秒數沒有意義）；修圖中停用開始／重新修圖／下載／另存／從圖庫選擇（換素材會讓結果對不上原圖），離開確認同圖生圖頁（`onBeforeRouteLeave`＋`beforeunload`），另外 `LibraryView` 切回「素材庫」分頁會卸載編輯器，透過 `defineExpose({ retouching })` 先確認。

### 重新修圖＝上一次條件再送一次

記住上一次成功送出的 `RetouchReq`，「重新修圖」原樣再送。上一發已成功、前端 key 已放掉，這一發是新 key、後端再扣一次；按鈕文字帶單價讓使用者知道。

### 另存與下載用真結果

另存走 `saveGenerated(name, 結果, 資料夾)`；`ALREADY_SAVED` 當已存入（同圖生圖頁）；另存本身就算採用。下載走 `downloadFile(tempUrl)`，未採用過才送 `recordAdoption`（後端 `record_adoption_event` 不看生成類型；採用率只算 `type='generate'`，所以 edit 的事件只記錄不影響指標）。新結果出來時重設「已存入」狀態；改勾選或指令不再重設（「已存入」屬於結果，不屬於設定）。

## Risks / Trade-offs

- `upscale2x` 後端只是多一句提示詞，不真的放大；只改說明文字，選項名「放大 2 倍」維持設計稿。
- 修圖中在「編輯圖片」分頁換底圖（同一個元件實例）會讓結果顯示在新原圖旁；修圖頁自己的「從圖庫選擇」已停用，跨分頁的情況不另外處理。
- `editor-object-layers` 未歸檔，其 delta 寫「AI 修圖頁另存維持 mock」；本 change 的同名 MODIFIED 以它的版本為底改寫，歸檔順序先它後本 change。

## Implementation Contract

**i18n 對齊檢查**：兩語系 key 差異必須等於基準（zh-Hant 獨有 8 個既有 `editor.retouch.*`：`presetsHint`＋7 個 `commandPresets.*`；en 獨有 0）。

**選項對照**

| 前端 `RetouchOptionKey` | 後端 `options` 值 |
| ----------------------- | ----------------- |
| `removeObjects`         | `removeObject`    |
| `repair`                | `fixFlaw`         |
| `lighting`              | `lightFix`        |
| `upscale`               | `upscale2x`       |
