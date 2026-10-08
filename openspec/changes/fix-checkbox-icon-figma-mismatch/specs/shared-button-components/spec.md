## ADDED Requirements

### Requirement: AppCheckbox 打勾符號 SHALL 使用向量圖示，不使用文字字元

`AppCheckbox.vue` 選中狀態的打勾符號 SHALL 使用 SVG 向量圖示（`viewBox 0 0 18 18`、`fill="currentColor"`，寬高填滿 `.appCheckbox__box`），SHALL NOT 使用純文字字元（例如「✓」）呈現。

> **決策沿革**：這個元件的打勾符號先後出現兩種相反的實作，都各自對照過 Figma 卻得出不同結論——第一輪（`fix-checkbox-icon-figma-mismatch` 初版，commit `4cda120`）依 PR review 對照 Figma node `441:2640` 的 `chk` 元件，判斷打勾是純文字「✓」字元（Noto Sans TC Bold），改成文字＋粗體字重；第二輪（同一個 change 的 ingest，commit `662b9a4`）使用者直接提供圖庫管理中心素材卡片實際用的打勾 SVG（18×18，深藍圓角方框＋白色勾勾路徑），改回向量圖示——這份 SVG 是使用者從設計稿實際匯出的原始資料，比對照截圖判斷的文字字元更可靠。這個 Requirement 就是為了讓「向量圖示」這個結論落地成可查驗的規格文字，不要再靠肉眼比對重新猜一次。

#### Scenario: 使用者勾選核取方塊

- **WHEN** 使用者點擊 `AppCheckbox`，狀態變成選中（`model` 為真、非 `indeterminate`）
- **THEN** `.appCheckbox__box` 內顯示打勾 SVG 圖示（`.appCheckbox__check`），撐滿整個方框，不是文字字元
