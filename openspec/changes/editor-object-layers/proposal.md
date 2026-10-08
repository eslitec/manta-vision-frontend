## Why

圖片編輯器的「加入物件」目前只有 mock 的文字描述生成：按下「生成物件」只會在畫布上放一個灰色佔位方塊，沒有任何真實影像；使用者手上明明有去背商品圖（圖庫 `source=object`、內建物件素材）卻沒有辦法把它疊到底圖上。另一方面，「另存為新素材」只有裁切工具走真上傳，加入物件／文字工具下另存仍走 mock `editImage`——切到真後端時新素材根本沒送出去，文字圖層也從來沒有被合成進輸出檔。

9/1 的 commit `d58051a` 對齊 Figma（1141:906）時刻意拿掉了「從圖庫疊圖」，spec `image-editor-ui` 也寫成「加入物件為文字描述生成，非從圖庫疊圖」。本次由產品（使用者）拍板推翻：加入物件可以從圖庫選圖成為真實圖層；AI 生成物件的按鈕維持 mock 現狀，不接後端。

## What Changes

- 「加入物件」面板新增「從圖庫選擇」：開啟 `ImagePickerDialog` 的物件模式（列 `GET /images?source=object`，後端已含內建物件；內建在此模式可選，因為物件圖層只用 `url`、不把 id 送後端），選了就以 `addObjectLayer(name, url)` 建立物件圖層。物件圖層真的顯示 `<img>`：置中、寬度＝底圖顯示寬的 40%、等比，可拖曳、縮放、複製（沿用文字圖層的 composables 與圖層清單）。AI 生成物件按鈕維持 mock。
- 「另存為新素材」把裁切用的輸出函式擴成 `buildOutputFile`：畫布以原圖像素為準，底圖後依 z-index 依序畫物件圖層與文字圖層（相對位置與縮放換算成原圖像素；文字先 `document.fonts.load()` 等字型，載不到退回系統字並 `console.warn`），輸出 PNG 走既有 `upload(file, folderId, sourceImageId, imageName)`。只要底圖有真圖 `url`（任何工具）就走真上傳，沒有 `url` 才落 mock。裁切＋圖層並存時先裁再疊。
- `SaveAssetDialog` 的「保留圖層」選項移除（真上傳沒有圖層概念；mock 路徑也不再需要）。
- `ImagePickerDialog` 新增 `mode` prop（預設 `'asset'` 維持既有過濾內建；`'object'` 送 `source=object` 且不過濾內建、隱藏來源篩選列），其他呼叫端不變。
- 座標換算抽成純函式 `src/utils/composite.ts`（`coverRect`／`percentRectInSource`／`percentPointInSource`／`layerRectInSource`），裁切的 `cropSourceRect` 改用同一套，並補 vitest。
- i18n 新 key `editor.addObject.pickFromLibrary`／`editor.addObject.pickerSubtitle` 兩語系同步；picker 標題沿用既有 `editor.objectPickerTitle`。
- mock 資料：`a1`（底圖）、`a2`／`a6`（物件）補 picsum 網址，讓 mock 模式也走得到物件圖層顯示與合成上傳的路徑。

## Non-Goals (optional)

- 不接 AI 生成物件的真後端（按鈕維持 mock，不呼叫扣點端點）。
- 不做背景移除結果的合成（背景移除仍是扣款紀錄，畫布沒有它的像素）。
- 不改 `GET /images` 的查詢契約、不動後端。
- 不做物件圖層的旋轉、裁切、透明度等進階編輯。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `image-editor-ui`：「加入物件」從「只能文字描述生成」改為「可從圖庫選圖成為物件圖層，或文字描述生成（mock）」；「另存為新素材」改為合成底圖＋物件圖層＋文字圖層後上傳（任何工具，只要底圖有真圖）；「保留圖層」不再提供。

## Impact

- Affected specs: `image-editor-ui`（REMOVED「加入物件為文字描述生成，非從圖庫疊圖」→ ADDED「加入物件可從圖庫選圖成為物件圖層」；MODIFIED「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」）
- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue（`editorPickerMode`／`openObjectPicker`、`ObjectEditorLayer.url`、`addObjectLayer(name, url)`、`buildOutputFile()`、`loadImageForCanvas()`、`resolveCanvasFont()`、`layersFingerprint`、`.objectObject.hasImage` 樣式）
  - Modified: src/components/ImagePickerDialog.vue（`mode` prop）
  - Modified: src/components/SaveAssetDialog.vue（移除「保留圖層」選項與 `keepLayers` 欄位）
  - Added: src/utils/composite.ts、src/utils/composite.spec.ts
  - Modified: src/lang/zh-Hant.ts、src/lang/en.ts（`editor.addObject.pickFromLibrary`／`pickerSubtitle`）
  - Modified: src/api/mock.ts（`a1`／`a2`／`a6` 補 `url`）
