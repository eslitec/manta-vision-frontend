## Context

`src/components/ImageEditorWorkspace.vue` 的畫布（`.artboard`）是固定 4:3 的框，底圖用 `object-fit: cover` 鋪滿；裁切框 `cropRect`、文字圖層 `TextEditorLayer.x/y`、物件圖層 `ObjectEditorLayer.x/y` 全都是相對這個框的百分比（0–100，x/y 為圖層中心點，元素用 `translate(-50%, -50%)` 對齊）。既有的裁切另存已經有一套「百分比 → 原圖像素」換算（`cropSourceRect`：先算 cover 顯示區在原圖裡的位置，再把 `cropRect` 換進去），以及跨網域安全的圖片載入（`fetch` 跳過快取取 Blob → `blob:` 網址餵 `Image`，canvas 不被污染）。

物件圖層目前沒有 `url`，模板固定畫 `IconImagePlaceholder`，`objectLayerStyle` 寬度 `24% × scale`、`aspect-ratio: 1`。拖曳／縮放／複製／刪除／圖層清單排序都已經是多實例架構（`usePercentDrag`／`usePointerDrag`、`duplicateSelectedLayer`、`layerZIndex`），只差圖層本身有沒有真圖。

`ImagePickerDialog` 一律 `load({ pageSize: 100 })` 並在前端過濾掉 `source === 'builtin'`（內建素材的 id 送到生成／編輯端點會 404，見 `library-builtin-source` 決策 6）。

## Goals / Non-Goals

**Goals:**

- 「加入物件」可從圖庫（`source=object`，含內建物件）選圖成為真實的 `<img>` 物件圖層，沿用既有拖曳／縮放／複製／刪除／排序。
- 「另存為新素材」把底圖＋物件圖層＋文字圖層合成成一張 PNG（原圖像素解析度）上傳真後端；任何工具下只要底圖有 `url` 就走這條。
- 座標換算抽成純函式並有單元測試；裁切顯示的尺寸（`cropOutputDimensions`）與實際輸出繼續共用同一套換算。

**Non-Goals:**

- AI 生成物件接真後端（維持 mock，且不呼叫扣點端點）。
- 背景移除結果的合成。
- 物件圖層的旋轉／裁切／透明度。

## Decisions

### 1. 同一顆 `ImagePickerDialog` 加 `mode` prop，而不是再放第二顆

`mode?: 'asset' | 'object'`，預設 `'asset'` 行為完全不變（其他呼叫端零改動）。`'object'` 模式：`load({ pageSize: 100, source: 'object' })`、`filtered` 不再排除 `builtin`、來源篩選列（全部／上傳／AI 生成）隱藏——物件模式下清單本來就只有 `object`／`builtin` 兩種來源，那三個 pill 沒有意義。

內建物件在物件模式可選的理由：物件圖層只拿 `url` 畫在畫布上，另存時是把像素合成進 PNG 再上傳，從頭到尾不把素材 id 送後端，`library-builtin-source` 決策 6 擔心的 404 不會發生。

`ImageEditorWorkspace` 用 `editorPickerMode` ref 記住這次開的是哪種用途；`selectEditorAsset` 在 `'object'` 模式直接 `addObjectLayer(asset.name, asset.url ?? '')` 後 return，`'asset'` 模式維持原本換底圖的流程。標題沿用既有的 `editor.objectPickerTitle`（「選擇要加入的物件」，d58051a 之前就有），副標新增 `editor.addObject.pickerSubtitle`。

### 2. 物件圖層資料模型：`ObjectEditorLayer.url: string`

圖庫選來的圖有 `url`；AI 生成（mock）傳空字串。模板 `img.objectObject__img(v-if="objectLayer.url")` / `IconImagePlaceholder(v-else)`；有 `url` 時加 class `hasImage`（`aspect-ratio: auto; background: transparent`，高度跟著圖片等比）。寬度：有 `url` 用 `OBJECT_LAYER_WIDTH_PERCENT = 40`（底圖顯示寬的 40%）× `scale`，佔位方塊維持 24%。圖庫選來的圖 `x/y = 50/50` 置中，AI mock 沿用框選範圍位置。`duplicateSelectedLayer` 的 `...source` 展開會一併複製 `url`，不用另外改。

### 3. 合成：`buildOutputFile` 取代 `buildCroppedFile`，輸出範圍＝「所見即所得」

座標換算全部走 `src/utils/composite.ts` 的純函式：

- `coverRect(natural, aspect)`：原圖以 cover 塞進 4:3 框時，實際顯示的那塊在原圖像素座標裡的矩形（寬圖左右裁、高圖上下裁）。
- `percentPointInSource(point, cover)`／`percentRectInSource(rect, cover)`：畫布百分比 → 原圖像素。
- `layerRectInSource(layer, widthPercent, aspect, cover)`：以中心點＋畫布寬百分比＋圖層本身寬高比展開成原圖像素矩形。

輸出矩形 `out`：`tool === 'crop'` 時＝`percentRectInSource(cropRect, cover)`（先裁再疊，框外的圖層自然被 canvas 邊界裁掉）；其餘工具＝`cover`（畫布顯示區）。選「畫布顯示區」而不是「整張原圖」的理由：圖層是相對畫布擺的，使用者放在畫布上緣的文字若輸出整張 9:16 原圖會落在圖中間，違反所見即所得；4:3 cover 本身是既有畫布的既定語意，這裡不擴大範圍。

畫的順序：底圖 `drawImage(img, out.x, out.y, out.width, out.height, 0, 0, w, h)` → `[...layers].reverse()`（`layers[0]` 在最上層，見 `layerZIndex`）逐一畫，跳過 `original` 與 `visible === false`：

- 物件：`loadImageForCanvas(url)`（與底圖同一條跨網域安全載入），`layerRectInSource(layer, 40 × scale, naturalW / naturalH, cover)`，平移 `-out.x / -out.y` 後 `drawImage`。沒有 `url`（AI mock）略過。
- 文字：字級 `1.25rem × scale` 是不隨畫布寬度變的 rem，換成原圖像素用「目前畫布顯示寬」當比例尺：`sizePx = 1.25 × scale × rootPx × (cover.width / artboardRef.offsetWidth)`（`offsetWidth` 不受 zoom 的 `transform: scale` 影響）。`textAlign = 'center'`、`textBaseline = 'middle'`，中心點 `percentPointInSource(layer, cover)` 平移後 `fillText`——`.textObject` 的 padding／border 對稱，中心就是文字中心。

字型策略（`resolveCanvasFont`）：`await document.fonts.load(spec)` 後 `document.fonts.check(spec)` 為真才用該字型；Google Fonts 走 `display=swap` 延遲載入，畫布上顯示過不代表載完。載不到（reject 或 check 為假）就 `console.warn` 並退回 `sans-serif`——寧可字型不對也不要整張存不下來。系統字（Arial／Georgia 等）不在瀏覽器的字型集合裡，`check` 依規範回 true，不受影響。

錯誤碼沿用既有 `CROP_NO_SOURCE_IMAGE`／`CROP_IMAGE_LOAD_FAILED`／`CROP_EXPORT_BLOCKED` 與 `classifySaveError`，物件圖層載入失敗也歸「圖片讀取被擋」那句訊息，不另增文案。

### 4. 走真上傳的條件從「裁切工具」放寬到「底圖有 `url`」

`saveAsNewAsset`：`if (selectedAssetUrl.value)` → `buildOutputFile` + `upload(file, folder, sourceImageId, name)`；否則維持 mock `saveEdited(name, { folder })`。`SaveAssetDialog` 移除「保留圖層」checkbox 與 `keepLayers` 欄位（真上傳沒有圖層概念）；`useAssets.saveEdited` 的 `keepLayers` 參數保留（既有測試與 mock 契約不動），只是呼叫端不再傳。

### 5. 「有未儲存的變更」改盯所有圖層

原本只有文字圖層的欄位進 fingerprint；另存現在會把物件圖層與可見性／順序都合成進去，`layersFingerprint` 改成走訪 `layers` 全部：每層 `key:visible`，文字加內容／顏色／縮放／字型／位置，物件加位置／縮放／url。

### 6. mock 資料補真圖

mock 素材一律沒有 `url`，mock 模式下物件圖層永遠是佔位方塊、另存永遠走 mock。比照試穿模特已經在用的 picsum，給 `a1`（底圖）與 `a2`／`a6`（物件）補 `url`，mock 冒煙才能走到「物件圖層真的顯示 → 合成 → mock `uploadImage` 以 `URL.createObjectURL(file)` 存進圖庫」整條路徑。

## Risks / Trade-offs

- [Risk] 文字字級以「另存當下的畫布顯示寬」換算，同一份圖層在不同視窗寬度另存，文字相對底圖的比例會不同 → [Mitigation] 這正是畫布上看到的比例（所見即所得）；若之後要固定比例，把字級改成畫布寬的百分比即可，換算函式不用動。
- [Risk] 物件圖片來自 R2，跨網域讀取被擋時整張另存失敗 → [Mitigation] 走與底圖相同、已實測過的 `fetch(cache: 'reload')` → Blob 路徑；失敗訊息沿用「圖片讀取被擋」文案。
- [Risk] `REMOVED` 舊 Requirement「加入物件為文字描述生成，非從圖庫疊圖」與仍在進行中的 `fix-editor-crop-cors`（同一條 Requirement 的 MODIFIED，加「更換底圖」文案）歸檔順序有相依 → [Mitigation] 本 change 的 ADDED Requirement 已把「更換底圖」那句一併納入，兩者任一先歸檔內容都完整；後歸檔的那個若撞到「Requirement 不存在」，以本 change 的 ADDED 內容為準。
