## Summary

抽出 usePointerDrag() 與 usePercentDrag() 兩個 composable，消除 ImageEditorWorkspace.vue 裡 5 個拖曳／縮放 handler 重複的 window pointer 事件樣板與百分比夾限數學。

## Motivation

ImageEditorWorkspace.vue 目前 2547 行，其中 startTextDrag、startObjectDrag、startObjectResize、startTextResize、startCropResize 這 5 個 handler 各自重複同一段 6 行的 window pointermove/pointerup 監聽綁定與清理樣板（各自維護一個獨立的 cleanup 變數：textDragCleanup、objectInteractionCleanup、textResizeCleanup、resizeCleanup）；其中 startTextDrag 與 startObjectDrag 更進一步共用幾乎逐字相同的百分比位置夾限數學，只差寫入 textPosition.x/y 還是 layer.x/y。這種重複讓修一個拖曳相關的 bug（例如清理時機、事件選項）容易漏改其他 4 處，也讓檔案不必要地變長。

## Proposed Solution

新增兩個 composable：

- usePointerDrag()（放在 src/composables/usePointerDrag.ts）：封裝 window pointermove/pointerup 監聽的綁定、單一進行中拖曳的清理（開始下一次拖曳前先清掉上一個)、以及 pointerup 用 once 選項自動卸載。對外暴露一個 start(onMove, onEnd?) 方法，呼叫端只需要提供自己的 onMove 回呼；元件卸載時可呼叫回傳的 stop() 手動清理。5 個 handler（startTextDrag、startObjectDrag、startObjectResize、startTextResize、startCropResize）都改用這個 composable，取代各自手寫的 onUp/cleanup 樣板。
- usePercentDrag()（放在 src/composables/usePercentDrag.ts）：封裝以容器（artboard）邊界為基準、把指標位移換算成百分比並依元素半寬高夾限在容器內的拖曳數學，內部使用 usePointerDrag()。對外暴露 start(event, options)，options 包含容器邊界元素、被拖曳元素的邊界元素、拖曳起點座標、以及拖曳中即時回呼 onDrag(x, y)。startTextDrag 與 startObjectDrag 改用這個 composable，各自在 onDrag 回呼裡把數值寫入 textPosition.x/y 或 layer.x/y。

startObjectResize（縮放，基於距離變化）、startTextResize（縮放，基於單軸位移）、startCropResize（四個角各自的夾限規則不同）維持各自的 onMove 數學，只換底層的事件綁定機制為 usePointerDrag()，不勉強套用 usePercentDrag()——它們的縮放邏輯彼此不同，硬抽會犧牲可讀性換取表面的行數減少。

## Non-Goals

- 不改變任何使用者可見行為：拖曳/縮放的操作手感、夾限範圍、cost 計算、UI 文案都維持原樣。
- 不處理 ObjectCorner 與 CropCorner 這兩個型別定義完全相同卻各自宣告一次的重複（觀察到但不在本次範圍）。
- 不處理檔案裡的 SCSS style 區塊（佔 2547 行中的約 1518 行），本次只處理 script 區塊的拖曳邏輯重複。
- 不新增任何測試框架或改變現有測試策略；本次沒有既有的自動化測試涵蓋這些拖曳 handler，驗證方式是手動操作編輯器確認拖曳/縮放手感不變（見 design.md 的 Implementation Contract）。

## Capabilities

### New Capabilities

- `editor-drag-composables`: 定義編輯器內拖曳／縮放互動的內部實作慣例——window pointer 事件綁定 SHALL 透過共用的 usePointerDrag composable，容器邊界百分比位置拖曳 SHALL 透過共用的 usePercentDrag composable。

### Modified Capabilities

(none)

## Impact

- Affected specs: editor-drag-composables（新增）
- Affected code:
  - New: src/composables/usePointerDrag.ts, src/composables/usePercentDrag.ts
  - Modified: src/components/ImageEditorWorkspace.vue
  - Removed: (none)
