## 1. 放置換算純函式

- [x] 1.1 依設計決策 1「三條規則的優先序」第 2 條：`src/utils/composite.ts` 新增 `containLayerInBox(box, aspect, artboardAspect)`（中心＝框中心、寬度＝`min(box.width, box.height × aspect ÷ artboardAspect)`），`src/utils/composite.spec.ts` 補 4 條（中心點、扁圖吃滿框寬、方圖吃滿框高、換回 `layerRectInSource` 後五種比例寬高都不超出且一邊貼齊）；驗證：`npx vitest run src/utils/composite.spec.ts` 11 passed，且把公式的 `÷ artboardAspect` 改成 `× artboardAspect` 後 2 failed（改壞會紅），還原後再綠

## 2. 更換／新增／取消選取

- [x] 2.1 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」、依設計決策 1「三條規則的優先序」：`src/components/ImageEditorWorkspace.vue` 新增 `selectedObjectLayer` computed；`selectEditorAsset` 的物件分支在有選取物件圖層時只換 `url`／`label`（不新增圖層），沒有時 `addObjectLayer(name, url, await imageAspect(url, asset))`；`addObjectLayer` 有 `url` 時以 `containLayerInBox(objectSelection, aspect, ARTBOARD_ASPECT)` 決定 `x/y` 與 `scale = widthPercent ÷ OBJECT_LAYER_WIDTH_PERCENT`，AI 生成（無 `url`）維持原本位置；依設計決策 3「不寫沒有框選範圍時的置中退路」，不保留置中 40% 的分支
- [x] 2.2 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」、依設計決策 2「圖片比例以瀏覽器載入的 `naturalWidth／naturalHeight` 為準」：新增 `imageAspect(url, fallback)`（`Image.decode()` 取 natural 比例，失敗退回 `Asset.width／height`，再退回 1；不帶 `crossOrigin`）
- [x] 2.3 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」、依設計決策 1 第 3 條：新增 `deselectObjectLayer`（物件工具下且選取的是物件圖層才清空 `selectedLayerKey`），掛在 `.canvas` 的 `pointerdown` 與 `startObjectSelectionDrag` 開頭；框選範圍拖曳不變
- [x] 2.4 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」：面板按鈕文案依 `selectedObjectLayer` 顯示 `editor.addObject.replaceImage`／`pickFromLibrary`，`editorPickerTitle`／`editorPickerSubtitle` 在物件模式依同一狀態切換；`src/lang/zh-Hant.ts`／`src/lang/en.ts` 同步新增 `editor.objectReplacePickerTitle`、`editor.addObject.replaceImage`、`editor.addObject.replacePickerSubtitle`
- [x] 2.5 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」（畫面上的寬度保留）、依設計決策 1 第 1 條的例外：`selectEditorAsset` 更換 AI 佔位（無 `url`）時 `scale *= PLACEHOLDER_WIDTH_PERCENT / OBJECT_LAYER_WIDTH_PERCENT`，`objectLayerStyle` 的 24 改用同一常數
- [x] 2.6 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」（框選範圍留在畫布內）：`startObjectSelectionDrag` 以框中心（`x + width/2`、`y + height/2`）交給 `usePercentDrag`，回呼再換回左上角——`usePercentDrag` 以中心點夾邊，原本把左上角當中心，框可拖出畫布半個框寬；共用的 `usePercentDrag` 不動（文字與物件圖層本來就是中心點語意）
- [x] 2.7 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」（AI 佔位置中於框）：`addObjectLayer` 無 `url` 時 `x/y` 改為框選範圍中心，原本用框的左上角當佔位中心，佔位偏到框的左上外側
- [x] 2.8 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」（選取提示依圖層類型）：`canvasHint` 依 `selectedLayer.type` 顯示 `editor.selectionInstruction`（文字）或新增的 `editor.selectionInstructionObject`（物件），其他情況不顯示；原本非裁切工具一律寫「選取中：文字圖層」；`src/lang/zh-Hant.ts`／`src/lang/en.ts` 同步新增該 key

## 3. 驗證

- [x] 3.1 `npx vitest run` 256 passed（基準 252 ＋ 本次 4）；`npx vue-tsc --noEmit` exit 0；`npm run lint` exit 0；`npx prettier --check` 改動檔全過；i18n 兩語系 key 差異與基準相同（zh-Hant 多 8 個既有 `editor.retouch.*`，en 多 0）
- [x] 3.2 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」：mock 冒煙（`VITE_USE_MOCK= npx vite --port 5177`、puppeteer-core 無頭 Chrome、真滑鼠事件）23 項——選取物件圖層 → 按鈕「更換圖片」、彈窗標題「選擇要替換的圖片」→ 選圖後物件圖層數仍 1、`img` src 換成新圖、left/top 不變、圖層清單名稱更新；點畫布空白處取消選取、按鈕回「從圖庫選擇」；點物件重新選取後從框選範圍拖曳 → 取消選取且框有移動；選圖 → 新圖層 `getBoundingClientRect` 在框內、中心差 < 2px、一邊貼齊框；「生成物件」（mock）產生佔位後選圖更換 → 圖層數不變、畫面寬度差 < 1px、left/top 不變。先讓它紅：改前同一腳本 11 項 FAIL（更換變新增、圖層置中不在框內、點空白不取消選取），2.5 改前佔位換圖寬度 99.45px → 165.75px FAIL，改後 23/23 PASS
- [x] 3.3 `spectra validate editor-object-replace` valid、`spectra analyze editor-object-replace` Coverage／Consistency 0；Gaps 1 是設計 Risks 所述的歸檔順序（MODIFIED 的 Requirement 由 `editor-object-layers` ADDED，主 spec 尚無），在不含 git 的複本先模擬 `spectra archive editor-object-layers` 後 validate 無警告、Coverage／Consistency／Gaps 皆 0（spectra 在 git worktree 內會解析到主工作區，須在複本上跑）
- [x] 3.5 對齊 Requirement「加入物件可從圖庫選圖成為物件圖層」：2.6–2.8 的 mock 冒煙（puppeteer-core 無頭 Chrome、真滑鼠事件）10 項——框往右下／左上拖 2000px 以上後整個在畫布內且貼齊邊緣、小幅拖曳位移等於滑鼠位移、AI 佔位中心與框中心差 < 2px 且在框內、選取物件圖層提示含「物件圖層」、取消選取後無「選取中」提示、選取文字圖層提示含「文字圖層」。先讓它紅：改前版本（scratchpad 複本）7 項 FAIL，改後 10/10 PASS；3.2 的 23 項冒煙在改後版本重跑 23/23 PASS；`npx vitest run` 256 passed、`vue-tsc` exit 0、`npm run lint` exit 0、prettier 改動檔全過、i18n 差異與基準相同
- [ ] 3.4 PR 合併並確認畫面驗收無誤後執行 `spectra archive editor-object-replace`
