# image-editor-ui Specification

## Purpose

TBD - created by archiving change 'sync-mv-09-design'. Update Purpose after archive.

## Requirements

### Requirement: 非破壞編輯，另存為新素材

編輯與修圖 SHALL 不覆寫原始素材；所有輸出 SHALL 以「另存為新素材」的方式產生新的編輯產物。

#### Scenario: 使用者編輯後另存

- **WHEN** 使用者在編輯畫布完成調整並「另存為新素材」
- **THEN** 產生一個來源為「編輯產物」的新素材，原圖不變

<!-- @trace
source: sync-mv-09-design
updated: 2026-08-21
code:
  - src/components/ImageEditorWorkspace.vue
  - src/components/SaveAssetDialog.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/feed.ts
  - src/api/mock.ts
  - src/types/api.ts
  - index.html
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: AI 工具即時扣款並顯示成本

編輯畫布與 AI 修圖的每個 AI 工具 SHALL 顯示其飼料成本，且在執行當下即時扣款。

#### Scenario: 使用者套用背景移除

- **WHEN** 使用者對素材套用「背景移除」
- **THEN** 顯示該工具成本並在執行時扣除對應飼料

<!-- @trace
source: sync-mv-09-design
updated: 2026-08-21
code:
  - src/components/ImageEditorWorkspace.vue
  - src/components/SaveAssetDialog.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/feed.ts
  - src/api/mock.ts
  - src/types/api.ts
  - index.html
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: AI 修圖提供分項修飾與對比

AI 修圖 SHALL 提供分項修飾（去除雜物／修復瑕疵／光線校正／放大），標示各項成本，並在完成後以「原圖／修圖後」對比呈現與總消耗。

#### Scenario: 使用者完成 AI 修圖

- **WHEN** 使用者選定修飾項目並生成
- **THEN** 顯示原圖與修圖後對比、總消耗顆數，並可重新修圖／下載／另存

<!-- @trace
source: sync-mv-09-design
updated: 2026-08-21
code:
  - src/components/ImageEditorWorkspace.vue
  - src/components/SaveAssetDialog.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/feed.ts
  - src/api/mock.ts
  - src/types/api.ts
  - index.html
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 裁切提供各通路預覽且不扣飼料

裁切 SHALL 提供比例選擇與各社群通路（IG 貼文／IG 限動／FB 貼文／LINE 圖文）預覽，標示是否被裁切；裁切與旋轉 SHALL NOT 消耗飼料。

#### Scenario: 使用者切換裁切比例

- **WHEN** 使用者選擇某個裁切比例
- **THEN** 各通路預覽更新並標示是否會被裁掉邊緣，且不扣飼料

<!-- @trace
source: sync-mv-09-design
updated: 2026-08-21
code:
  - src/components/ImageEditorWorkspace.vue
  - src/components/SaveAssetDialog.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/feed.ts
  - src/api/mock.ts
  - src/types/api.ts
  - index.html
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 字型選單的九個字體家族與 Figma list_font 逐項一致

文字圖層屬性面板的字型選單 SHALL 提供與 Figma `list_font`（node `1157:872`）一致的字體家族選項，分為「中文」與「英數」兩組共九項，不得多也不得少；選單 SHALL 以自訂 listbox（`role="listbox"` / `role="option"`）呈現分組標頭、字體名稱、副標與選中列打勾，並提供 default／active 兩種 trigger 框線狀態。

#### Scenario: 使用者開啟字型選單

- **WHEN** 使用者點擊字型下拉 trigger
- **THEN** trigger 框線由 `#d2d5dd`（default）變為 `#2e3567`（active），並展開自訂 listbox

##### Example: 九個字體家族分兩組

| 分組                       | 字體                                                                   |
| -------------------------- | ---------------------------------------------------------------------- |
| 中文（思源系列・開放商用） | 思源黑體 Noto Sans TC、思源宋體 Noto Serif TC                          |
| 英數（系統安全字體）       | Inter、Roboto、Arial、Helvetica、Georgia、Times New Roman、Courier New |

#### Scenario: 選單不含設計稿未收錄的字體

- **WHEN** 使用者開啟字型選單
- **THEN** 選單 SHALL NOT 出現 Chiron GoRound TC、霞鶩文楷 TC、jf open 粉圓、芫荽

#### Scenario: 使用者選取一個字體家族

- **WHEN** 使用者在 listbox 點選某個字體家族
- **THEN** 該列以 Medium 500 字重與 `#eff2fa` 底色標示為選中，並顯示 14×14 打勾圖示

<!-- @trace
source: sync-mv-09-design
updated: 2026-08-21
code:
  - src/components/ImageEditorWorkspace.vue
  - src/components/SaveAssetDialog.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/feed.ts
  - src/api/mock.ts
  - src/types/api.ts
  - index.html
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->
