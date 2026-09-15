## 1. 建立 composable

- [x] 1.1 落地設計決策「決策 1：usePointerDrag() 只封裝事件綁定與清理，不含任何座標數學」：在 src/composables/usePointerDrag.ts 實作 usePointerDrag()，對外暴露 `start(onMove, onEnd?)` 與 `stop()`；驗證方式：對照 design.md 的 Implementation Contract 逐行核對 start/stop 行為與現有 5 個 handler 的 onUp/cleanup 樣板一致
- [x] 1.2 落地設計決策「決策 2：usePercentDrag() 接受外部注入的 usePointerDrag 實例，預設才自己建立一個」：在 src/composables/usePercentDrag.ts 實作 usePercentDrag(pointerDrag?)，內部 import usePointerDrag，對外暴露 `start(options)` 與 `stop()`；驗證方式：核對數學公式（halfWidth/halfHeight 換算、nextX/nextY 位移換算、夾限範圍）與 design.md 列出的公式逐行相同

## 2. 遷移 ImageEditorWorkspace.vue 的 5 個 handler

- [x] 2.1 對齊 Requirement「拖曳事件綁定 SHALL 透過共用的 usePointerDrag composable」：把 startTextResize 與 startCropResize 改用各自獨立的 usePointerDrag 實例（textResizeDrag、cropResizeDrag）取代原本的 textResizeCleanup／resizeCleanup 手寫樣板，縮放數學本身不變；驗證方式：`grep -n "textResizeCleanup\|resizeCleanup" src/components/ImageEditorWorkspace.vue` 結果為空
- [x] 2.2 落地設計決策「決策 3：物件圖層拖曳與縮放共用同一個 usePointerDrag 實例，比照現有 objectInteractionCleanup 的互斥語意」：建立共用的 objectPointerDrag（usePointerDrag 實例）與 objectDrag（用它包裝的 usePercentDrag 實例），startObjectDrag 改用 objectDrag.start()、startObjectResize 改用 objectPointerDrag.start() 直接綁定原本的距離縮放數學；驗證方式：`grep -n "objectInteractionCleanup" src/components/ImageEditorWorkspace.vue` 結果為空，且手動測試「按住拖曳物件、不放開、再按住同物件的縮放把手」時舊的拖曳監聽會被清掉
- [x] 2.3 對齊 Requirement「容器邊界百分比位置拖曳 SHALL 透過共用的 usePercentDrag composable」：startTextDrag 改用獨立的 usePercentDrag 實例（textDrag）取代原本的 textDragCleanup 手寫樣板與百分比夾限數學；驗證方式：`grep -n "textDragCleanup" src/components/ImageEditorWorkspace.vue` 結果為空

## 3. 清理與驗證

- [x] 3.1 更新 onBeforeUnmount：把原本呼叫 4 個 cleanup 變數的地方改成呼叫 textDrag、objectPointerDrag、textResizeDrag、cropResizeDrag 這 4 個 composable 實例的 `.stop()`；驗證方式：`grep -n "Cleanup" src/components/ImageEditorWorkspace.vue` 結果為空（4 個 cleanup 變數名稱已完全移除）
- [x] 3.2 全面驗證 Implementation Contract 的驗收標準：執行 `npm run build` 與 `npm run lint` 皆通過，並手動在編輯器裡操作五種互動（文字拖曳、物件拖曳、物件縮放、文字縮放、裁切縮放）確認夾限範圍與縮放上下限跟重構前一致
