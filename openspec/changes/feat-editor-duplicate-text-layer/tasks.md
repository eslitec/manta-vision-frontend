## 1. 資料型別與 computed

- [x] 1.1 落地設計決策「決策 1：新增 `TextEditorLayer` 型別，比照 `ObjectEditorLayer` 的多實例模式」：`src/components/ImageEditorWorkspace.vue` 新增 `TextEditorLayer` 型別（`content`／`color`／`x`／`y`／`scale`／`fontId` 欄位）
- [x] 1.2 落地設計決策「決策 2：移除五個全域 ref，改用 `selectedTextLayer` computed 讀寫目前選取圖層的欄位」：移除 `textContent`／`textColor`／`textPosition`／`textScale`／`selectedFontId` 五個全域 ref／reactive；新增 `selectedTextLayer` computed 與 `textLayers` computed

## 2. 畫布渲染與拖曳／縮放

- [x] 2.1 落地設計決策「決策 3：畫布改成 `v-for` 渲染所有文字圖層，比照 `.objectObject` 的既有模式」：`.textObject` 區塊改成 `v-for="layer in textLayers" v-show="layer.visible"`，新增 `textLayerStyle(layer)`；`textDragging`／`textEditing` 改成 `draggingTextKey`／`editingTextKey`（記錄 key 的 ref）
- [x] 2.2 落地設計決策「決策 4：`textObjectRef` 改成 `Map<string, HTMLElement>`，用圖層 key 索引多個 contenteditable 節點」：新增 `textObjectRefs` 與 `setTextObjectRef`，`v-for` 裡的 `span.textObject__content` 改用函式型 `:ref` 綁定
- [x] 2.3 落地設計決策「決策 5：拖曳／縮放函式改成接收目標圖層，比照 `startObjectDrag`／`startObjectResize` 的既有模式」：`startTextDrag`／`startTextResize`／`handleTextResizeKeydown`／`resizeTextBy` 改成接收 `layer: TextEditorLayer` 參數，讀寫該圖層自己的 `x`／`y`／`scale`

## 3. 文字編輯與屬性面板

- [x] 3.1 落地設計決策「決策 4：`textObjectRef` 改成 `Map<string, HTMLElement>`，用圖層 key 索引多個 contenteditable 節點」：`beginTextEdit(key)`／`finishTextEdit(key)`／`handleTextKeydown(event, key)` 改成透過 `textObjectRefs.get(key)` 操作對應的 DOM 節點，寫入對象改成 `layers` 裡對應 key 那一筆的 `content` 欄位
- [x] 3.2 落地設計決策「決策 2：移除五個全域 ref，改用 `selectedTextLayer` computed 讀寫目前選取圖層的欄位」：右側「文字屬性」面板（`.properties`）顯示條件改成 `v-if="selectedTextLayer"`，輸入框／字型選單／顏色選取器的 `v-model` 全部改綁 `selectedTextLayer`

## 4. 新增與複製圖層

- [x] 4.1 落地設計決策「決策 6：`insertTextLayer()` 改成每次都新增一筆新圖層，仿照 `addObjectLayer`」：新增 `addTextLayer()`，`insertTextLayer()` 改成每次呼叫都新增新圖層並立即 `beginTextEdit(layer.key)`，不再判斷「已經有就不新增」
- [x] 4.2 對齊 Requirement「圖層清單「+」按鈕可以複製文字圖層」，落地設計決策「決策 7：`duplicateSelectedLayer()` 放寬到同時支援物件與文字圖層」：`duplicateSelectedLayer()` 判斷放寬成允許 `'object'` 或 `'text'`；`canDuplicateSelectedLayer` 同步放寬
- [x] 4.3 落地設計決策「決策 8：`layerLabel`／未儲存狀態偵測，改讀圖層自己的欄位」：`layerLabel(layer)` 文字分支改讀傳入 `layer` 的 `content` 欄位；新增 `textLayersFingerprint` computed 取代原本盯著五個全域 ref 的 `watch`

## 5. 驗證

- [x] 5.1 `npx vue-tsc --noEmit` 通過（確認沒有任何地方仍引用已移除的 `textContent`／`textColor`／`textPosition`／`textScale`／`selectedFontId`）
- [x] 5.2 `npm run lint` 通過
- [x] 5.3 對齊 Requirement「圖片編輯器支援同時存在多筆獨立的文字圖層」——瀏覽器手動驗證（`agent-browser`，真後端帳號 `qa_brand_test`）：選定素材後點擊「文字」工具輸入「限時優惠」，再次點擊「文字」工具輸入「立即搶購」，圖層清單同時顯示「文字：限時優惠」與「文字：立即搶購」兩筆項目，第一筆內容沒有被覆蓋
- [x] 5.4 對齊 Requirement「拖曳、縮放、編輯其中一筆文字圖層不影響其他筆」——瀏覽器手動驗證：對其中一筆文字圖層（複製出的「限時優惠」）的縮放把手觸發鍵盤縮放（3 次 ArrowUp），該筆 `fontSize` 從 `1.25rem` 變成 `1.75rem`，另外兩筆（「立即搶購」與原始「限時優惠」）皆維持 `1.25rem` 不變
- [x] 5.5 對齊 Requirement「切換字型或顏色只作用在選取中的文字圖層」——瀏覽器手動驗證：選取「立即搶購」圖層並把顏色改成 `#ea903a`，確認畫布上只有這一筆的文字顏色變成 `rgb(234, 144, 58)`，另外兩筆「限時優惠」皆維持預設的 `rgb(46, 53, 103)`
- [x] 5.6 對齊 Requirement「複製文字圖層產生獨立的新圖層」——瀏覽器手動驗證：選取「限時優惠」圖層點擊「+」，圖層清單新增第三筆內容相同的「文字：限時優惠」，共存在三筆文字圖層（含一筆「立即搶購」），複製出的圖層可獨立縮放不影響來源圖層（見 5.4 的縮放結果）
- [x] 5.7 對齊 Requirement「選取物件圖層時「+」按鈕的既有行為不變」——瀏覽器手動驗證：用「加入物件」新增一筆「物件：一顆藍色氣球」圖層並點擊「+」複製，確認複製出第二筆內容相同的物件圖層，既有的物件圖層複製行為沒有被這次改動影響
- [x] 5.8 執行 `spectra validate feat-editor-duplicate-text-layer --strict` 與 `spectra analyze feat-editor-duplicate-text-layer`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 5.9 PR 合併並確認畫面驗收無誤後執行 `spectra archive feat-editor-duplicate-text-layer`
