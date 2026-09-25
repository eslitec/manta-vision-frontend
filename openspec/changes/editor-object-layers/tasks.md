## 1. 座標換算純函式

- [x] 1.1 依設計決策 3「合成：`buildOutputFile` 取代 `buildCroppedFile`」：新增 `src/utils/composite.ts`（`coverRect`／`percentPointInSource`／`percentRectInSource`／`layerRectInSource`）與 `src/utils/composite.spec.ts`（cover 寬圖／高圖／剛好 4:3、預設 1:1 裁切框、置中 40% 圖層、cover 有偏移時平移）；驗證：`npx vitest run src/utils/composite.spec.ts` 7 passed，且刻意把 `layerRectInSource` 的 `width / aspect` 改成 `width * aspect` 後 1 failed（改壞會紅），還原後再綠

## 2. 選圖彈窗物件模式

- [x] 2.1 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」、依設計決策 1「同一顆 `ImagePickerDialog` 加 `mode` prop，而不是再放第二顆」：`src/components/ImagePickerDialog.vue` 新增 `mode` prop（預設 `'asset'` 行為不變）；`'object'` 模式 `load({ pageSize: 100, source: 'object' })`、`filtered` 不排除 `builtin`、來源篩選列隱藏；驗證：`npx vue-tsc --noEmit` 通過，其他呼叫端（生成／試穿／修圖來源）不傳 `mode` 行為不變

## 3. 物件圖層真的顯示圖片

- [x] 3.1 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」、依設計決策 2「物件圖層資料模型：`ObjectEditorLayer.url: string`」：`src/components/ImageEditorWorkspace.vue` 新增 `editorPickerMode`／`openObjectPicker`／`editorPickerSubtitle`，`selectEditorAsset` 在物件模式呼叫 `addObjectLayer(asset.name, asset.url ?? '')`；`ObjectEditorLayer` 加 `url`，模板有 `url` 畫 `img.objectObject__img`（class `hasImage`）、沒有才畫佔位圖示；`objectLayerStyle` 有 `url` 用 `OBJECT_LAYER_WIDTH_PERCENT = 40`；「加入物件」面板標題下新增「從圖庫選擇」按鈕；AI 生成按鈕維持 mock
- [x] 3.2 `src/lang/zh-Hant.ts`／`src/lang/en.ts` 新增 `editor.addObject.pickFromLibrary`／`editor.addObject.pickerSubtitle`，兩語系同步；驗證：兩語系 key 集合差異與基準相同（zh-Hant 多 8 個既有 `editor.retouch.*`，en 多 0 個）

## 4. 另存合成上傳

- [x] 4.1 對齊 Requirement「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」、依設計決策 3「合成：`buildOutputFile` 取代 `buildCroppedFile`」與 4「走真上傳的條件從「裁切工具」放寬到「底圖有 `url`」」：`buildCroppedFile` 擴成 `buildOutputFile`——抽出 `loadImageForCanvas(url)`（底圖與物件共用跨網域安全載入）、`resolveCanvasFont()`（`document.fonts.load` → `check`，載不到 `console.warn` 退回 `sans-serif`）；輸出範圍裁切工具＝裁切框、其餘＝畫布顯示區；依 `[...layers].reverse()` 畫物件（`layerRectInSource`）與文字（`fillText`，字級以畫布顯示寬換算）；`saveAsNewAsset` 改為底圖有 `url` 就走 `upload(file, folder, sourceImageId, name)`；`cropSourceRect` 改用 `percentRectInSource(cropRect, coverRect(...))`
- [x] 4.2 依設計決策 4「走真上傳的條件從「裁切工具」放寬到「底圖有 `url`」」：`src/components/SaveAssetDialog.vue` 移除「保留圖層」checkbox 與 `keepLayers` 欄位；`ImageEditorWorkspace.vue` 的 `SaveAssetPayload` 同步移除、`saveEdited(name, { folder })` 不再傳 `keepLayers`
- [x] 4.3 依設計決策 5「「有未儲存的變更」改盯所有圖層」：`textLayersFingerprint` 改成走訪所有圖層的 `layersFingerprint`（可見性、物件位置／縮放／url 也會重置「已儲存」狀態）
- [x] 4.4 依設計決策 6「mock 資料補真圖」：`src/api/mock.ts` 的 `a1`／`a2`／`a6` 補 picsum `url`，讓 mock 模式走得到物件圖層顯示與合成上傳

## 5. 驗證

- [x] 5.1 `npx vitest run` 238 passed（基準 231 ＋ 本次 7）；`npx vue-tsc --noEmit` exit 0；`npx eslint .` exit 0；`npx prettier --check` 改動檔全過
- [x] 5.2 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」與「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」：mock 冒煙（`VITE_USE_MOCK= npx vite --port 5174`、puppeteer-core 無頭 Chrome）——加入物件 → 從圖庫選 → 畫布出現 `img` 物件圖層、可拖曳 → 加文字圖層 → 另存 → 選圖彈窗出現新素材且為合成後的 PNG；截圖存 scratchpad/objlayer/（實跑結果：物件模式清單 3 筆含內建可選、來源篩選列隱藏；物件圖層 `img` 寬 40%、拖曳後 50%/50% → 78.8%/69.2%；另存後選圖彈窗出現「春季主視覺_01_文字編輯版」標「編輯產物」，blob PNG 1024×768，物件與文字位置與畫布一致；console 無字型 warning）
- [x] 5.3 `spectra validate editor-object-layers`、`spectra analyze editor-object-layers` 無 CRITICAL／WARNING（Coverage／Consistency／Gaps 皆為 0）
- [ ] 5.4 PR 合併並確認畫面驗收無誤後執行 `spectra archive editor-object-layers`

## 6. 審查修正（2026-09-25 兩份審查）

- [x] 6.1 對齊 Requirement「非破壞編輯…另存為新素材真的存到後端」新增 Scenario「AI 修圖頁另存維持 mock」、依設計決策 4 補述：`saveAsNewAsset` 的真上傳條件加 `props.mode !== 'retouch'`——修圖頁沒有畫布、`tool` 停在 `'remove'`，原本會把未修圖的原圖 4:3 置中裁切後上傳成「修圖版」
- [x] 6.2 對齊 Scenario「原圖圖層隱藏時另存不畫底圖」、依設計決策 3 補述：`buildOutputFile` 的底圖 `drawImage` 加 `originalLayer.value?.visible !== false` 守衛，隱藏時 PNG 底透明
- [x] 6.3 依設計決策 3 字型策略：`resolveCanvasFont` 多收 `text`（圖層文字內容）傳給 `document.fonts.load`／`check`，並以 `Promise.race` 加 3 秒上限 `FONT_LOAD_TIMEOUT_MS`——實測 headless Chrome 下 Noto Sans TC 的部分 FontFace 卡在 `status='loading'`（無網路請求在飛），不設上限 `fonts.load(spec, text)` 永不 resolve、另存無限轉圈
- [x] 6.4 文字比例尺 `artboardRef.offsetWidth` → `clientWidth`（padding box，圖層百分比定位的基準）；物件圖層 1px 邊框造成的 2 畫布 px 微差留 `ponytail:` 註解；`objectSelection` 上方過時註解（「不是從素材庫挑現成圖片直接疊上去」）改寫為兩條路徑；`design.md`／`proposal.md`／spec 拿掉不存在的「刪除」圖層功能；`src/lang/zh-Hant.ts`／`en.ts` 刪除無人使用的 `editor.saveDialog.keepLayers`
- [x] 6.5 驗證：`npx vitest run` 238 passed；`npx vue-tsc --noEmit` exit 0（TS2448／TS2454 為 0）；`npx eslint .` exit 0；`npx prettier --check` 改動檔全過；i18n 兩語系 key 差異與基準相同（zh-Hant 多 8 個既有 `editor.retouch.*`，en 多 0）；`spectra validate`／`analyze` Coverage／Consistency／Gaps 皆 0；mock 冒煙腳本 `scratchpad/objlayer_smoke.cjs`（puppeteer-core，對 `VITE_USE_MOCK= npx vite --port 5174`）11 項全過——另存 #1 原圖可見四角 alpha=255（對照組）、解鎖原圖取消勾選後另存 #2 四角 alpha=0 且中心物件仍在、字型退回 sans-serif 時 console 有警告且另存 4 秒內完成、AI 修圖頁另存不產生 canvas blob；先讓它紅：暫時拿掉兩個守衛後恰好「save#2 四角透明」「retouch 不走 canvas」兩項轉紅，還原後全綠
