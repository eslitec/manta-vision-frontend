# shared-button-components Specification

## Purpose

TBD - created by archiving change 'sync-components-buttons'. Update Purpose after archive.

## Requirements

### Requirement: 共用按鈕 SHALL 對應 Figma type

系統 SHALL 以 `AppButton` 的 `variant` 表達 `primary`、`secondary`、`outline`、`alert`、`ghost`、`subtle` 六種 Figma type。

#### Scenario: 顯示主要操作

- **WHEN** 頁面顯示生成、儲存或前往圖庫等主要操作
- **THEN** 使用 `AppButton` 的 `primary` variant

#### Scenario: 顯示危險操作

- **WHEN** 頁面顯示刪除或永久刪除操作
- **THEN** 使用 `AppButton` 的 `alert` variant

<!-- @trace
source: sync-components-buttons, fix-checkbox-icon-figma-mismatch
updated: 2026-09-01
code:
  - src/components/AppButton.vue
  - src/components/AppCheckbox.vue
  - src/components/AppPill.vue
  - src/components/AppTab.vue
-->

---

### Requirement: 共用按鈕 SHALL 支援完整互動狀態

每個 variant SHALL 具有 default、hover、pressed、focus 與 disabled 狀態；執行非同步操作時 SHALL 可呈現 loading 狀態及 `aria-busy`。

#### Scenario: 鍵盤聚焦按鈕

- **WHEN** 鍵盤使用者將焦點移入按鈕
- **THEN** 顯示清楚可辨識的焦點環

#### Scenario: 按鈕停用

- **WHEN** 按鈕為 disabled 或 loading
- **THEN** 原生按鈕不可觸發，並呈現停用視覺

<!-- @trace
source: sync-components-buttons, fix-checkbox-icon-figma-mismatch
updated: 2026-09-01
code:
  - src/components/AppButton.vue
  - src/components/AppCheckbox.vue
  - src/components/AppPill.vue
  - src/components/AppTab.vue
-->

---

### Requirement: 共用按鈕 SHALL 使用一致尺寸

一般按鈕 SHALL 為 36px 高、14px Medium 文字、18px 圓角；緊湊或帶圖示版本 SHALL 使用 16px 圓角。

#### Scenario: 顯示一般按鈕

- **WHEN** 頁面渲染預設尺寸的 `AppButton`
- **THEN** 最小高度為 36px，文字為 14px／500／18px line-height

<!-- @trace
source: sync-components-buttons, fix-checkbox-icon-figma-mismatch
updated: 2026-09-01
code:
  - src/components/AppButton.vue
  - src/components/AppCheckbox.vue
  - src/components/AppPill.vue
  - src/components/AppTab.vue
-->

---

### Requirement: 非 btn 控制項 SHALL 保留獨立元件

Figma 中的 chip、tab、option card、model option、icon-only 與 tool button SHALL NOT 因為底層使用 `<button>` 就改成 `AppButton`。

#### Scenario: 顯示可選取的 chip

- **WHEN** 使用者選擇來源、比例或篩選條件
- **THEN** 使用對應的 chip 或 option 樣式，並透過 `aria-pressed` 或 tab 語意表達狀態

<!-- @trace
source: sync-components-buttons, fix-checkbox-icon-figma-mismatch
updated: 2026-09-01
code:
  - src/components/AppButton.vue
  - src/components/AppCheckbox.vue
  - src/components/AppPill.vue
  - src/components/AppTab.vue
-->

---

### Requirement: AppCheckbox 打勾符號 SHALL 使用向量圖示，不使用文字字元

`AppCheckbox.vue` 選中狀態的打勾符號 SHALL 使用 SVG 向量圖示（`viewBox 0 0 18 18`、`fill="currentColor"`，寬高填滿 `.appCheckbox__box`），SHALL NOT 使用純文字字元（例如「✓」）呈現。

> **決策沿革**：這個元件的打勾符號先後出現兩種相反的實作，都各自對照過 Figma 卻得出不同結論——第一輪（`fix-checkbox-icon-figma-mismatch` 初版，commit `4cda120`）依 PR review 對照 Figma node `441:2640` 的 `chk` 元件，判斷打勾是純文字「✓」字元（Noto Sans TC Bold），改成文字＋粗體字重；第二輪（同一個 change 的 ingest，commit `662b9a4`）使用者直接提供圖庫管理中心素材卡片實際用的打勾 SVG（18×18，深藍圓角方框＋白色勾勾路徑），改回向量圖示——這份 SVG 是使用者從設計稿實際匯出的原始資料，比對照截圖判斷的文字字元更可靠。這個 Requirement 就是為了讓「向量圖示」這個結論落地成可查驗的規格文字，不要再靠肉眼比對重新猜一次。

#### Scenario: 使用者勾選核取方塊

- **WHEN** 使用者點擊 `AppCheckbox`，狀態變成選中（`model` 為真、非 `indeterminate`）
- **THEN** `.appCheckbox__box` 內顯示打勾 SVG 圖示（`.appCheckbox__check`），撐滿整個方框，不是文字字元

<!-- @trace
source: fix-checkbox-icon-figma-mismatch
updated: 2026-09-08
code:
  - src/components/AppCheckbox.vue
-->
