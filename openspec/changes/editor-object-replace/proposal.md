## Why

使用者回報：在「加入物件」工具下（畫布上有被選取的物件圖層，另有「在此範圍生成物件」的框選範圍），從右側面板「從圖庫選擇」選完圖後，沒辦法更換目前選取的那個圖層，結果永遠是在畫布正中央新增一個圖層。

原因有三：`selectEditorAsset` 的物件分支一律呼叫 `addObjectLayer`（只會新增）；圖庫物件固定放在畫布中心（`x/y = 50/50`、寬 40%），完全不看框選範圍；而且物件圖層一旦被選取就沒有取消選取的途徑，使用者無從在「更換」與「新增」之間切換。

## What Changes

- 從圖庫選圖時，若目前選取的是物件圖層（圖庫物件或 AI 生成的佔位物件），改為**更換該圖層的圖片**：只換 `url` 與圖層名稱（AI 佔位換圖時 `scale` 另換算成相同畫面寬度），位置、畫面上的寬度、圖層順序、顯示與鎖定保留，圖層數不變。
- 沒有選取物件圖層時，新增的物件圖層**放進畫布上的框選範圍**：中心對齊框中心，以圖片原始比例 contain 進框（寬高都不超出）。換算抽成純函式 `containLayerInBox`（`src/utils/composite.ts`）並補 vitest。
- 「加入物件」工具下，點畫布空白處或框選範圍（沒點到圖層）會取消物件圖層的選取；框選範圍的拖曳不變。
- 面板按鈕文案依狀態顯示「更換圖片」／「從圖庫選擇」，選圖彈窗標題與副標同步切換（「選擇要替換的圖片」／「選擇要加入的物件」）。i18n 兩語系同步新增 `editor.objectReplacePickerTitle`、`editor.addObject.replaceImage`、`editor.addObject.replacePickerSubtitle`。

## Non-Goals (optional)

- 不改 AI 生成物件（mock）的放置方式與流程，不呼叫任何扣點端點。
- 不改另存合成（`buildOutputFile`）、圖層拖曳／縮放／z-index 與圖層清單副標的既有邏輯（副標本來就依 `url` 判斷，更換後自然更新）。
- 不新增框選範圍的拖角縮放。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `image-editor-ui`：「加入物件可從圖庫選圖成為物件圖層」的選圖語意改為「有選取物件圖層＝更換圖片；否則＝新增到框選範圍（contain）」，並加入取消選取與依狀態切換的按鈕／彈窗文案。

## Impact

- Affected specs: `image-editor-ui`（MODIFIED「加入物件可從圖庫選圖成為物件圖層」）
- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue（`selectedObjectLayer`、`deselectObjectLayer`、`selectEditorAsset` 物件分支、`addObjectLayer` 放置、`imageAspect`、`editorPickerTitle`／`editorPickerSubtitle`、面板按鈕文案、`.canvas` 的 pointerdown、`startObjectSelectionDrag`）
  - Modified: src/utils/composite.ts、src/utils/composite.spec.ts（`containLayerInBox`）
  - Modified: src/lang/zh-Hant.ts、src/lang/en.ts
