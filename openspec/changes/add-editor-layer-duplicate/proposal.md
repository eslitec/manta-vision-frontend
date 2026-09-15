## Why

圖層清單面板標題列右側的「+」按鈕（Figma `panel_layers` / `1141:942`）目前完全沒有串接任何行為——沒有 `@click`、沒有對應功能，是個視覺上存在但實際上是死的按鈕；它的 `aria-label` 也錯誤地沿用面板標題（`editor.layers`「圖層」）而非描述按鈕本身的動作，對螢幕報讀器使用者造成誤導。物件圖層（`ObjectEditorLayer`）目前可以透過「加入物件」流程一個一個生成，但使用者若想要一個已經調整好位置／縮放的物件圖層的另一份拷貝（例如同一個裝飾元素要在畫布上重複擺放），除了重新走一次文字描述生成流程、再手動調整到相同位置，沒有更快的路徑。把這顆「+」按鈕接上「複製目前選取的圖層」，同時修掉既有的 `aria-label` 誤用，能補上這個缺口且不需要新增額外 UI 元素。

## What Changes

- 圖層清單面板標題列的「+」按鈕（`aside.layers` > `h3` 內）串接 `duplicateSelectedLayer()` 行為：
  - 未選取任何圖層時，按鈕 SHALL 停用。
  - 選取的圖層是 `'original'` 圖層時，按鈕 SHALL 停用（`'original'` 在既有程式碼中是鎖定、不可重新排序、不可刪除的單例底圖，複製不屬於這個模型，不在本次範圍內）。
  - 選取的圖層是 `'text'` 圖層時，按鈕 SHALL 停用（既有程式碼將文字圖層當作單例：`textLayer` computed 用 `type === 'text'` 找唯一一個，`insertTextLayer()` 只在 `!textLayer.value` 時才建立新的，否則重用既有的；複製文字圖層會破壞這個單例假設，不在本次範圍內）。
  - 選取的圖層是 `'object'` 圖層時，按鈕 SHALL 啟用；點擊後 SHALL 建立一個新的 `ObjectEditorLayer`，複製來源圖層的視覺屬性（`label`、`x`、`y`、`scale`），指定全新且唯一的 `key`（沿用 `addObjectLayer()` 既有慣例：`` `object-${crypto.randomUUID()}` ``），以與 `addObjectLayer()` 相同的插入方式（`layers.unshift(...)`）加入 `layers`，且新複製出的圖層 SHALL 在複製完成後成為目前選取的圖層。
- 修正按鈕既有的 `aria-label` 錯誤：新增 i18n key `editor.duplicateLayer`（新的複製動作描述文字），取代誤用的 `t('editor.layers')`；`src/lang/zh-Hant.ts` 與 `src/lang/en.ts` 同步新增此 key，維持兩邊 key 結構一致。

## Non-Goals (optional)

（design.md 將會建立，Non-Goals 統一記錄於 design.md 的 Goals/Non-Goals 段落，此處留空。）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `image-editor-ui`: 圖層清單新增「複製目前選取的物件圖層」這項規格化行為，並修正「+」按鈕原本沒有對應功能、`aria-label` 誤用面板標題的既有缺陷。

## Impact

- Affected specs: `image-editor-ui`（新增一個 Requirement，涵蓋圖層清單複製物件圖層的行為與各圖層類型的啟用/停用規則）
- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue
  - Modified: src/lang/zh-Hant.ts
  - Modified: src/lang/en.ts
