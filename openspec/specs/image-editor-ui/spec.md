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

#### Scenario: 背景移除執行中顯示處理覆蓋層

- **WHEN** 背景移除仍在執行中
- **THEN** 畫布上顯示處理中覆蓋層（含說明文字與取消按鈕），避免使用者誤以為畫面卡住

<!-- @trace
source: sync-mv-09-design, fix-mv09-editor-figma-mismatches
updated: 2026-09-01
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

AI 修圖 SHALL 提供分項修飾（去除雜物／修復瑕疵／光線校正／放大），標示各項成本，並在完成後以「原圖／修圖後」對比呈現與總消耗。指令修圖 SHALL 以常用指令快速鍵搭配文字輸入，採一口價計費，不提供分項勾選。修圖方式（快速修飾／指令修圖）SHALL 以選中／未選中兩種樣式呈現：選中時底色 `#eff2fa`、框線 1.5px `#2e3567`、標題文字 `#2e3567`；未選中時白底、框線 1px `#d2d5dd`、標題文字 `#383c4b`。

#### Scenario: 使用者完成 AI 修圖

- **WHEN** 使用者選定修飾項目並生成
- **THEN** 顯示原圖與修圖後對比、總消耗顆數，並可重新修圖／下載／另存

#### Scenario: 指令修圖採一口價，不提供分項勾選

- **WHEN** 使用者切換到「指令修圖」
- **THEN** 畫面顯示常用指令快速鍵與指令輸入框，不顯示分項修飾勾選清單，預估成本僅顯示一口價基本費

#### Scenario: 選中的修圖方式底色與標題文字變色

- **WHEN** 使用者點選「快速修飾」或「指令修圖」
- **THEN** 該按鈕底色變為 `#eff2fa`、框線加粗為 1.5px `#2e3567`、標題文字變為 `#2e3567`；未選中的按鈕維持白底、`#d2d5dd` 框線與 `#383c4b` 標題文字

#### Scenario: AI 修圖執行中顯示處理進度

- **WHEN** 使用者送出修圖後仍在等待結果
- **THEN** 「修圖後」對比欄位顯示處理中狀態，包含目前處理到第幾個項目與進度條

<!-- @trace
source: sync-mv-09-design, fix-mv09-editor-figma-mismatches, fix-mv09-retouch-method-style
updated: 2026-09-01
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

裁切 SHALL 提供比例選擇與各社群通路（IG 貼文／IG 限動／FB 貼文／LINE 圖文）預覽，標示是否被裁切；裁切與旋轉 SHALL NOT 消耗飼料。選定固定比例（非自訂拖曳）後 SHALL 顯示套用結果徽章，並提供復原裁切／重新裁切／另存為新素材操作。

#### Scenario: 使用者切換裁切比例

- **WHEN** 使用者選擇某個裁切比例
- **THEN** 各通路預覽更新並標示是否會被裁掉邊緣，且不扣飼料

#### Scenario: 選定固定比例後顯示套用結果

- **WHEN** 使用者點選一個固定比例（非「自訂」）
- **THEN** 畫布顯示比例與尺寸徽章，並提供「復原裁切」「重新裁切」「另存為新素材」三個操作；點選「自訂」或「重新裁切」則回到可拖曳調整的框選狀態

<!-- @trace
source: sync-mv-09-design, fix-mv09-editor-figma-mismatches
updated: 2026-09-01
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

### Requirement: 加入物件為文字描述生成，非從圖庫疊圖

編輯畫布的「加入物件」工具 SHALL 讓使用者在畫布上框選範圍，並以文字描述（可搭配常用物件預設快速鍵）生成新圖層；加入物件 SHALL NOT 消耗飼料。

#### Scenario: 使用者生成新物件圖層

- **WHEN** 使用者選取「加入物件」工具、輸入物件描述並點擊「生成物件」
- **THEN** 在選取範圍建立一個新的物件圖層，圖層清單同步更新，且不扣飼料

#### Scenario: 使用者點選常用物件預設

- **WHEN** 使用者點選「花束」「綠植」「杯盤」「陰影」「裝飾字卡」等預設
- **THEN** 對應文字加入物件描述輸入框，可再自行編輯

<!-- @trace
source: fix-mv09-editor-figma-mismatches
updated: 2026-09-01
code:
  - src/components/ImageEditorWorkspace.vue
  - src/lang/zh-Hant.ts
-->

---

### Requirement: 字型選單的九個字體家族與 Figma list_font 逐項一致

文字圖層屬性面板的字型選單 SHALL 提供與 Figma `list_font`（node `1157:872`）一致的字體家族選項，分為「中文」與「英數」兩組共九項，不得多也不得少；選單 SHALL 以自訂 listbox（`role="listbox"` / `role="option"`）呈現分組標頭、字體名稱、副標與選中列打勾，並提供 default／active 兩種 trigger 框線狀態。文字圖層屬性面板本身（Figma node `1157:619`）SHALL 有 16px 內距，且與上方圖層清單之間 SHALL 有 1px 分隔線。

#### Scenario: 文字屬性面板有內距與上方分隔線

- **WHEN** 使用者選取文字圖層，顯示「文字屬性」面板
- **THEN** 面板內容（文字輸入框、字型下拉、色票、字重說明）與面板左右邊界保持 16px 內距，且面板上方與圖層清單之間有一條分隔線

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
source: sync-mv-09-design, fix-mv09-properties-panel-spacing
updated: 2026-09-01
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
