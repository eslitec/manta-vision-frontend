## Why

品牌設定頁「視覺識別」分頁上傳 Logo 後，會分析出建議色供使用者加入色票。原本「全部套用」只抓偵測到的前 3 色（對應主色／輔色／點綴色三個固定角色），Logo 顏色比較豐富時，第 4 種以後的建議色就被捨棄，使用者只能一個一個手動加。使用者要求色票支援全部套用（不再限制 3 色）與自訂新增。

## What Changes

- 「全部套用」不再只抓前 3 色，改成把偵測到的顏色全部塞進色票（上限 10 色）：前 3 筆維持指派主色／輔色／點綴色，第 4 筆以後自動命名「點綴色2」「點綴色3」……
- 手動「新增」色票（`swatch--add` 按鈕）套用同一套自動命名規則；色票達到 10 色上限時，「新增」按鈕自動隱藏
- 色票區塊第 4 個以後，名稱從固定文字改成可編輯輸入框，讓使用者自行改色票名稱（例如把「點綴色2」改成「輔助藍」）
- 色票標籤旁新增「{目前筆數} / 10」的計數提示
- 後端目前僅支援 `primary`／`secondary`／`accent` 三個具名欄位（`app/schemas/brand.py` 的 `ColorPalette`，`extra="forbid"`），在後端改成陣列格式之前，第 4 個以後的自訂色票**不會存到真後端**——這是 `brand-real-backend-wiring` 已經記錄過的既有已知限制（`api/real.ts` 的 `buildColorPalette()` 只用陣列前 3 個索引），這次只是讓畫面與互動邏輯先就緒，不改動這個既有限制

## Non-Goals

- 不修改後端 `ColorPalette` 的資料結構或新增陣列格式的端點——這是後端評估中的獨立工作，不在這次前端改動範圍內
- 不處理第 4 個以後色票的持久化問題——沿用 `brand-real-backend-wiring` 已經記錄的既有限制（只有前 3 筆會存到真後端），這次不解決，只讓 UI 互動先就緒
- 不改變色票指派主色／輔色／點綴色的邏輯（前 3 筆固定角色），只擴充第 4 筆以後的行為

## Capabilities

### Modified Capabilities

- `brand-settings-ui`：「視覺識別可上傳 Logo 並管理色票」Requirement 擴充——「全部套用」改成套用全部偵測到的顏色（上限 10 色）而非只取前 3 色，新增第 4 個以後色票的自訂命名與上限行為

## Impact

- Affected specs: brand-settings-ui
- Affected code:
  - Modified: src/views/BrandSettingsView.vue（`MAX_COLORS`、`nextColorLabel()`、`addColor()`／`applyAllColors()` 改造、色票名稱輸入框樣板與樣式）
  - Modified: src/lang/zh-Hant.ts（新增 `brandSettings.color.extra`／`customName`）
  - Modified: src/lang/en.ts（同上，兩語系同步）
