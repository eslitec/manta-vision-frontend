## Context

`src/components/ImageEditorWorkspace.vue` 的「加入物件」有兩條路：從圖庫選圖（`openObjectPicker` → `selectEditorAsset` 的 `'object'` 分支 → `addObjectLayer(name, url)`）與 AI 生成（mock，`generateObjectFromDescription` → `addObjectLayer(description)`）。物件圖層 `ObjectEditorLayer` 的 `x/y` 是畫布百分比的中心點（`translate(-50%, -50%)`），寬度＝`(url ? 40 : 24) × scale` 畫布寬百分比，高度隨圖片等比。框選範圍 `objectSelection` 是 `{ x, y, width, height }` 畫布百分比（左上角＋寬高），只在物件工具下顯示、只支援拖曳移動；它的 z-index 壓在圖層之下（`editor-object-layers` 7.1）。

改前：物件分支一律新增、圖庫物件固定置中 40%；`selectedLayerKey` 只會被設成某個圖層，沒有任何途徑清空，所以物件圖層一旦被選取就一直是選取狀態。

## Goals / Non-Goals

**Goals:**

- 從圖庫選圖能更換目前選取的物件圖層，也能新增到框選範圍；使用者看得出目前是哪一種，且能切換。

**Non-Goals:**

- AI 生成物件（mock）的放置方式、另存合成、圖層拖曳與 z-index 都不動。

## Decisions

### 1. 三條規則的優先序

在物件模式的選圖彈窗選定素材時，依序判斷：

1. **有選取的物件圖層**（`selectedObjectLayer`：`selectedLayer.type === 'object'`，圖庫物件與 AI 佔位物件都算）→ 更換：`target.url = asset.url`、`target.label = editor.objectLayerDynamic(name)`，其餘欄位（`x/y/scale`、在 `layers` 裡的位置、`visible/locked`）不動，不新增圖層。原圖或文字圖層被選取時不算，走第 2 條。「已儲存」狀態由既有的 `layersFingerprint`（含 `url`）自動重置，不另外處理。
2. **沒有選取物件圖層** → 新增圖層並放進框選範圍：`containLayerInBox(objectSelection, aspect, ARTBOARD_ASPECT)` 回傳中心點（框中心）與寬度百分比 `min(box.width, box.height × aspect ÷ (4/3))`，`scale = widthPercent ÷ 40`，沿用 `OBJECT_LAYER_WIDTH_PERCENT` 與 `layerRectInSource` 同一套座標語意，所以另存合成不必改。
3. **取消選取**：物件工具下 `.canvas` 的 `pointerdown`（畫布空白處、畫布外圍灰底）與框選範圍的 `pointerdown`（它有 `.stop`，所以在 `startObjectSelectionDrag` 開頭呼叫）都走 `deselectObjectLayer`，只在目前選取的是物件圖層時把 `selectedLayerKey` 清成 `''`。物件與文字圖層的 `pointerdown` 都有 `.stop`，點到圖層本身不會取消；框選範圍的拖曳照常進行。

按鈕文案與彈窗標題／副標都看 `selectedObjectLayer`，所以使用者在按下之前就知道結果是「更換圖片」還是「從圖庫選擇（新增）」。

### 2. 圖片比例以瀏覽器載入的 `naturalWidth／naturalHeight` 為準，`Asset.width／height` 只當退路

`imageAspect(url, asset)`：`new Image()` → `decode()` → `naturalWidth / naturalHeight`；載不到才用 `Asset.width／height`，再不行當 1。理由：畫布上的 `<img>` 顯示的是瀏覽器轉正（EXIF）後的 natural 尺寸，後端 Pillow 量的是檔頭尺寸（主畫布 `onSourceImgLoad` 早就因此改用 natural）；實測 mock 的物件素材 `a2`／`a6` 宣告 1024×768、實圖是 400×400，若以 `Asset` 尺寸 contain，正方形圖的高度會超出框 33%。不帶 `crossOrigin`，與畫布 `<img>` 同一種請求、共用快取（避開 `loadImageForCanvas` 說明的 R2 快取問題）。代價是新增圖層要等圖片載入（通常已在選圖彈窗的快取裡）。

### 3. 不寫沒有框選範圍時的置中退路

`objectSelection` 是常駐的 reactive 物件，物件模式的選圖彈窗只能從物件面板開啟（此時 `tool === 'object'`、框選範圍一定顯示），所以不存在「沒有框選範圍」的狀態，不寫這條死分支。

## Risks / Trade-offs

- [Risk] 新增的圖層放在框選範圍上、z-index 又高於框選範圍，圖片比例接近框的比例時會蓋住整個框，框選範圍一時拖不到 → [Mitigation] 圖片 contain 後通常留有邊，可從邊上拖；蓋滿時先把圖層拖開即可。不改 z-index（`editor-object-layers` 7.1 已說明裁切工具下圖層必須留在 `.cropFrame` 之下）。
- [Risk] 本 change MODIFIED 的 Requirement「加入物件可從圖庫選圖成為物件圖層」是仍在進行中的 `editor-object-layers` ADDED 的，主 spec 目前還沒有它，`spectra analyze` 會報一條「MODIFIED requirement not found in main spec」→ [Mitigation] 歸檔順序：先 `spectra archive editor-object-layers`，再歸檔本 change；已在不含 git 的複本上模擬先歸檔 `editor-object-layers`，本 change 的 validate 不再警告、analyze 的 Consistency 為 0。
- [Risk] 取消選取後圖層清單沒有任何列是選取狀態 → 這正是「新增」模式的狀態，與進入編輯器前的初始狀態（`selectedLayerKey === ''`）相同，既有邏輯都已處理空選取。
