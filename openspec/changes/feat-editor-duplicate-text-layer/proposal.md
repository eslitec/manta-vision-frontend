## Why

圖片編輯器（`src/components/ImageEditorWorkspace.vue`）圖層清單的「+」按鈕（`duplicateSelectedLayer`）目前只能複製「物件」圖層，選中「文字」圖層時這顆按鈕是停用狀態。使用者實測後明確要求文字圖層也要能用「+」複製。

## What Changes

現況架構問題：物件圖層是「多實例」架構——`layers` 陣列裡可以同時存在多筆 `type==='object'` 的圖層，每一筆各自帶自己的 `x`／`y`／`scale`／`dragging`／`label` 等欄位（`ObjectEditorLayer` 型別），複製時就是把來源物件的欄位整組 spread 進一筆新的、換一個 key 的物件裡。但文字圖層目前是「全域單例」架構：`layers` 陣列裡最多只會有一筆 key 固定寫死是 `'text'` 的文字圖層存在，這筆圖層本身的內容／位置／字級／字型／顏色完全不是存在圖層物件裡，而是存在五個獨立的全域 ref：`textContent`、`textColor`、`textPosition`（reactive）、`textScale`、`selectedFontId`。畫布渲染、右側「文字屬性」面板、拖曳、縮放、雙擊編輯全部都是直接讀寫這五個全域 ref。

要讓文字圖層也能複製出第二筆、兩筆各自獨立能移動／編輯／有自己的字級字型顏色，必須把文字圖層從「全域單例＋固定 key」改成跟物件圖層同樣的「多實例，圖層自己帶資料」架構：

1. 新增 `TextEditorLayer` 型別（比照 `ObjectEditorLayer` 的模式）：`EditorLayer & { type: 'text'; content: string; color: string; x: number; y: number; scale: number; fontId: FontId }`
2. 移除 `textContent`／`textColor`／`textPosition`／`textScale`／`selectedFontId` 這五個全域 ref，改成透過一個新的 `selectedTextLayer` computed 讀寫目前選取中的文字圖層自己的欄位；新增 `textLayers` computed（比照 `objectLayers`，篩選 `layers` 裡所有 `type==='text'` 的項目）
3. 畫布的 `.textObject` 區塊從單一的 `v-if="textLayer?.visible"` 改成 `v-for="textLayer in textLayers" v-show="textLayer.visible"`（比照 `.objectObject` 的寫法），新增 `textLayerStyle(layer)` 依每一筆自己的欄位算樣式
4. 右側「文字屬性」面板的顯示條件、輸入框／字型選單／顏色選取器的 `v-model` 綁定，全部改成綁 `selectedTextLayer`
5. `insertTextLayer()` 改成每次點擊「文字」工具都新增一筆新的文字圖層（比照 `addObjectLayer` 的模式，不再判斷「已經有的話就不新增」），新增後立即進入雙擊編輯狀態
6. `duplicateSelectedLayer()` 的判斷從「只允許 `source.type === 'object'`」放寬成「允許 `'object'` 或 `'text'`」
7. `beginTextEdit`／`finishTextEdit`／`handleTextKeydown`／`startTextDrag`／`startTextResize`／`handleTextResizeKeydown`／`resizeTextBy` 改成接收「正在操作的是哪一筆文字圖層」當參數；`textObjectRef` 改成用 `Map<string, HTMLElement>`（用圖層 key 當索引）管理多個文字圖層各自的 contenteditable 節點
8. `layerLabel(layer)` 裡文字圖層的分支改成讀取傳入的 `layer` 自己的 `content` 欄位
9. 既有用來偵測「使用者編輯了什麼、需要重新標記未儲存」的 `watch`（原本盯著五個全域 ref），改成用一個字串化所有文字圖層目前內容的 computed 取代

## Non-Goals

- 不改變物件圖層（`ObjectEditorLayer`）既有的複製／拖曳／縮放邏輯本身
- 不改變原圖圖層（`type==='original'`）的任何邏輯
- 不改變「加入物件」「背景移除」「裁切」這幾個工具本身跟文字圖層無關的邏輯
- 不改變 `canDuplicateSelectedLayer` 以外，其他既有跟圖層清單相關的行為（拖曳排序、鎖定、可見度切換）

## Capabilities

### New Capabilities

- `editor-multi-text-layer`：圖片編輯器支援同時存在多筆獨立的文字圖層，各自可移動／縮放／編輯內容字型顏色，並可用「+」複製出新的文字圖層

## Impact

- Affected specs: editor-multi-text-layer
- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue
