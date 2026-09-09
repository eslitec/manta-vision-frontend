## 1. i18n 字串

- [x] 1.1 依設計決策「`aria-label` 改用新的 i18n key `editor.duplicateLayer`」：在 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts` 的 `editor` namespace 下新增 `duplicateLayer` key（分別為「複製圖層」與 "Duplicate layer"），與既有 `editor.selectLayer`、`editor.reorderLayer` 同層級；驗證方式：`npx vue-tsc --noEmit` 通過（型別不因 i18n 結構改變而報錯），並在兩份語言檔中以文字搜尋確認 `duplicateLayer` key 同時存在且結構一致。

## 2. 圖層複製邏輯

- [x] 2.1 對齊 Requirement「圖層清單可依選取圖層型別複製物件圖層」、依設計決策「依圖層型別決定啟用狀態：`canDuplicateSelectedLayer`」：在 `src/components/ImageEditorWorkspace.vue` 新增 `selectedLayer` 與 `canDuplicateSelectedLayer` 兩個 computed，`canDuplicateSelectedLayer` 在找不到選取圖層、或選取圖層 `type` 為 `'original'`／`'text'` 時為 `false`，選取圖層 `type` 為 `'object'` 時為 `true`；驗證方式：`npx vue-tsc --noEmit` 通過，並在瀏覽器中對三種圖層型別與無選取狀態手動確認 computed 回傳值（可透過 Vue devtools 或暫時的 console.log 檢查後移除）。
- [x] 2.2 對齊 Requirement「圖層清單可依選取圖層型別複製物件圖層」、依設計決策「複製沿用 `addObjectLayer()` 既有的 key 產生與插入慣例」：新增函式 `duplicateSelectedLayer()`，複製目前選取的物件圖層——以 `` `object-${crypto.randomUUID()}` `` 產生全新且唯一的 `key`、複製來源圖層的 `label`／`x`／`y`／`scale`／`visible`／`locked`、`dragging` 重置為 `false`，以 `layers.unshift(...)` 插入清單最前面，並將 `selectedLayerKey` 更新為新圖層的 `key`；若 `canDuplicateSelectedLayer.value` 為 `false` 時被呼叫則直接 return、不修改任何狀態；驗證方式：手動在瀏覽器中選取一個物件圖層並觸發複製，於 Vue devtools 檢查 `layers` 陣列新增了一筆屬性相符、`key` 不同的物件圖層，且 `selectedLayerKey` 等於新圖層的 `key`。
- [x] 2.3 依設計決策「「+」按鈕改為呼叫 `duplicateSelectedLayer()`」：把圖層清單面板標題列（`aside.layers` 內 `h3` 之後）原本沒有 `@click` 的「+」按鈕改為 `:disabled="!canDuplicateSelectedLayer"` 並綁定 `@click="duplicateSelectedLayer"`，`aria-label` 改為 `t('editor.duplicateLayer')`（取代原本誤用的 `t('editor.layers')`）；驗證方式：在瀏覽器 DOM 中檢查該按鈕元素的 `aria-label` 屬性值不再等於面板標題文字，且在選取 `'original'`／`'text'` 圖層或無選取時該按鈕帶有 `disabled` 屬性、點擊無反應，選取 `'object'` 圖層時按鈕不帶 `disabled`。

## 3. 驗證

- [x] 3.1 對齊 Requirement「圖層清單可依選取圖層型別複製物件圖層」：執行 `npm run build`（`vue-tsc --noEmit` + `vite build`）與 `npm run lint`，兩者皆需通過，確認新增的 computed、函式與模板變更沒有型別錯誤或 ESLint 違規。
- [x] 3.2 對齊 Scenario「選取物件圖層時複製按鈕啟用並建立拷貝」與「複製按鈕的 aria-label 描述複製動作」：於本機開發伺服器中以瀏覽器（或 Playwright）操作圖編輯器，依序驗證——(a) 未選取任何圖層、選取 `'original'` 圖層、選取 `'text'` 圖層時「+」按鈕皆為停用狀態；(b) 選取一個既有的物件圖層後點擊「+」按鈕，圖層清單新增一筆屬性相符的新物件圖層並自動成為選取狀態；(c) 該按鈕的 `aria-label` 為「複製圖層」（或對應語系的 `editor.duplicateLayer` 翻譯），不是「圖層」。
