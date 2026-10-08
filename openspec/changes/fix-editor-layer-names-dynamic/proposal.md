## Problem

圖片編輯器右側「圖層」面板對「原圖」與「文字」兩種圖層顯示的名稱，是寫死在語系檔裡的示範字串（`原圖：春季主視覺_01`、`文字：春季新品 上市`），跟使用者實際載入的素材檔名、實際輸入的文字內容完全無關。即使使用者換了完全不同的素材進編輯器、或把文字改成別的內容，圖層面板上的名稱永遠原地不動，一直顯示這兩句固定文字，看起來像是忘了刪除的示範/測試資料。

## Root Cause

`src/components/ImageEditorWorkspace.vue` 的 `layerLabel(layer)` 函式（第 781 行）：`layer.label ?? t(\`editor.layerItems.${layer.type}\`)`——沒有自己 `.label` 欄位的圖層，一律 fallback 到只依圖層型別決定的固定語系字串。

- 「原圖」圖層在 `layers` 陣列初始化時（第 777 行）完全沒有給 `.label`，因此永遠 fallback 到 `t('editor.layerItems.original')` → `src/lang/zh-Hant.ts` 第 671 行寫死的 `'原圖：春季主視覺_01'`。畫面上其實已經有一個會正確更新的真實素材名稱：`selectedAssetName` 這個 ref（第 411 行初始化，`selectEditorAsset()` 第 430-433 行在使用者選定素材時正確更新成 `asset.name`，畫面上方標題、圖片 `alt` 屬性、另存新素材的預設檔名都正確使用這個 ref）——圖層面板單純沒有讀它。
- 「文字」圖層在 `insertTextLayer()` 建立時（第 847-861 行）同樣沒有給 `.label`，fallback 到 `t('editor.layerItems.text')` → `src/lang/zh-Hant.ts` 第 669 行寫死的 `'文字：春季新品 上市'`。使用者實際輸入的文字內容存在 `textContent` 這個 ref 裡（第 580 行，`v-model` 綁定屬性面板的文字輸入框），圖層面板同樣沒有讀它，使用者改了文字，面板名稱完全不會跟著變。
- 對照組：「物件」圖層（`addObjectLayer()`，第 873-889 行）已經做對了——建立當下就用 `label: t('editor.objectLayerDynamic', { name: description })` 把使用者實際輸入的物件描述動態組進名稱，`src/lang/zh-Hant.ts` 第 543 行 `objectLayerDynamic: '物件：{name}'` 已經是帶參數的樣板寫法。這次只是把「原圖」「文字」也改成同一個已經驗證可行的模式。

## Proposed Solution

1. `src/lang/zh-Hant.ts`／`src/lang/en.ts` 把 `editor.layerItems.original`、`editor.layerItems.text` 從固定字串改成帶參數的樣板，比照 `objectLayerDynamic` 的寫法：`original: '原圖：{name}'`、`text: '文字：{text}'`（英文版對應調整）
2. `ImageEditorWorkspace.vue` 的 `layerLabel(layer)` 依圖層型別動態帶入真正的資料：`type === 'original'` 時傳入 `{ name: selectedAssetName.value }`；`type === 'text'` 時傳入 `{ text: textContent.value }`；`type === 'object'` 維持原本 `layer.label ?? ...` 的邏輯不變（物件圖層一律有自己的 `.label`，不會走到這個 fallback）
3. 因為 `textContent` 是即時綁定使用者輸入的 `ref`，圖層面板裡「文字」圖層的名稱會隨著使用者在屬性面板打字即時更新，不是只在建立圖層當下組一次字串就固定住

## Non-Goals

- 不處理 `selectedAssetName`／`textContent` 這兩個 ref 本身在真實資料進來之前的初始預設值（`editor.demoAsset`／`editor.demoText`）——那是這兩個 ref 的初始狀態設計，跟這次「圖層面板名稱要跟著真實資料變化」是同一份底層資料但不同的關注點，這次不擴大處理
- 不改動「物件」圖層的命名邏輯，它已經正確
- 不改動圖層的其他屬性（順序、鎖定、可見性、複製）或圖層面板以外的任何 UI

## Success Criteria

- 使用者載入一個素材進編輯器，圖層面板「原圖」那一列顯示的名稱是這次真正載入的素材檔名（跟畫面上方標題、另存新素材預設檔名一致），不是寫死的「春季主視覺_01」
- 使用者新增文字圖層並修改文字內容，圖層面板「文字」那一列的名稱即時跟著輸入內容變化
- 使用者新增或複製物件圖層，命名行為維持不變（不受這次改動影響）

## Impact

- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue
  - Modified: src/lang/zh-Hant.ts
  - Modified: src/lang/en.ts
