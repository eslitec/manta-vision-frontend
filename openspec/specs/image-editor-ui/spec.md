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

裁切 SHALL 提供比例選擇與各社群通路（IG 貼文／IG 限動／FB 貼文／LINE 圖文）預覽，標示是否被裁切；裁切與旋轉 SHALL NOT 消耗飼料。選定固定比例（非自訂拖曳）後 SHALL 顯示套用結果徽章，並提供復原裁切／重新裁切／另存為新素材操作。比例選擇列與「自訂」按鈕之間 SHALL 只保留 8px 間距；「各通路預覽」標題上方 SHALL 有 1px 分隔線；各通路名稱標題文字色 SHALL 為 `#2e3567`。選定固定比例時，畫布上 SHALL 顯示跟「自訂」裁切一致的虛線外框、灰底變暗遮罩與可拖曳的角落把手，讓使用者能清楚辨識目前的取景範圍；拖曳把手 SHALL 維持該比例做等比例縮放，SHALL NOT 讓寬高各自變形，也 SHALL NOT 因此把比例改為「自訂」；套用結果徽章 SHALL 錨定在裁切框本身的左上角（而非整個畫布的左上角）。只有使用者主動點選「自訂」或「重新裁切」才會進入無比例限制的自由裁切模式。「復原裁切／重新裁切／另存為新素材」三個操作 SHALL 在固定比例與自訂裁切下皆顯示，不因裁切模式而缺漏。已套用固定比例時，側邊欄尺寸文字 SHALL 顯示「已裁切為 {寬} × {高} px（原圖 {原寬} × {原高}）」，通路預覽標題 SHALL 顯示「套用後各通路預覽」，完全符合比例的通路副標文字 SHALL 為綠色「完整呈現」，其餘通路副標文字 SHALL 為灰色「上下留白」（非橘色警示，因為只是留白不是內容遺失）；自訂裁切時則維持「寬 {width} px ・ 高 {height} px ・ 旋轉 0°」與「各通路預覽」／「會被裁掉邊緣」（橘色）文案。

#### Scenario: 使用者切換裁切比例

- **WHEN** 使用者選擇某個裁切比例
- **THEN** 各通路預覽更新並標示是否會被裁掉邊緣，且不扣飼料

#### Scenario: 選定固定比例後顯示套用結果

- **WHEN** 使用者點選一個固定比例（非「自訂」）
- **THEN** 畫布顯示比例與尺寸徽章，並提供「復原裁切」「重新裁切」「另存為新素材」三個操作；點選「自訂」或「重新裁切」則回到可拖曳調整的框選狀態

#### Scenario: LINE 圖文縮圖在格子中上下置中

- **WHEN** 使用者查看各通路預覽的「LINE 圖文 16:9」縮圖
- **THEN** 該縮圖（比其他三個通路矮）SHALL 在跟其他通路等高的格子裡上下置中，不是貼齊格子底部

#### Scenario: 比例選擇列與自訂按鈕間距、分隔線與標題字色

- **WHEN** 使用者開啟裁切面板
- **THEN** 固定比例 chips 與「自訂」按鈕之間 SHALL 只有 8px 間距（不因容器高度撐開變大）；「各通路預覽」標題上方 SHALL 有一條 1px `#d2d5dd` 分隔線；各通路名稱標題文字色 SHALL 為 `#2e3567`

#### Scenario: 固定比例下拖曳角落把手維持比例縮放

- **WHEN** 使用者選定固定比例（如 1:1）後，拖曳畫布上裁切框的角落把手
- **THEN** 取景範圍以對角為錨點等比例放大或縮小，比例本身不變、也不會切換成「自訂」；畫布顯示跟「自訂」裁切一致的虛線外框與灰底變暗遮罩，套用結果徽章錨定在裁切框左上角

#### Scenario: 使用者主動切換到自訂裁切

- **WHEN** 使用者點選「自訂」chip 或畫布上的「重新裁切」
- **THEN** 進入無比例限制的自由裁切模式，畫布顯示虛線外框與變暗遮罩，寬高可各自獨立調整

#### Scenario: 自訂裁切下也顯示裁切操作按鈕

- **WHEN** 使用者處於自訂裁切模式
- **THEN** 畫布下方 SHALL 同樣顯示「復原裁切／重新裁切／另存為新素材」三個按鈕；此時點選「重新裁切」會把取景框重設為滿版，而非沒有反應

#### Scenario: 已套用固定比例時側邊欄文案切換

- **WHEN** 使用者選定固定比例（非自訂）
- **THEN** 側邊欄尺寸文字改為「已裁切為 {寬} × {高} px（原圖 1440 × 1080）」、通路預覽標題改為「套用後各通路預覽」，完全符合比例的通路副標為綠色「完整呈現」，其餘通路副標為灰色「上下留白」；上方比例列到這段文字留 12px、文字到下方分隔線留 4px

<!-- @trace
source: sync-mv-09-design, fix-mv09-editor-figma-mismatches, fix-mv09-line-preview-centering, fix-mv09-crop-panel-spacing, fix-mv09-crop-locked-resize, fix-mv09-crop-applied-panel-text
updated: 2026-09-03
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

編輯畫布的「加入物件」工具 SHALL 讓使用者在畫布上框選範圍，並以文字描述（可搭配常用物件預設快速鍵）生成新圖層；加入物件 SHALL NOT 消耗飼料。物件描述輸入框 SHALL 支援最多 200 字並顯示字數計數；畫布上的框選範圍 SHALL 有淡藍色底色 `rgba(46,53,103,0.1)` 與 6px 圓角，讓框選區域清楚可辨識。「加入物件」面板（標題／描述框／字數／預設列／提示文字／按鈕）SHALL 統一以 10px 間距排列，不因子項目各自共用的樣式（如字數計數的負邊距，或 `aside.layers` 底下 `h3` 共用的內距／最小高度）而疊加變形；面板標題文字本身 SHALL 貼齊、不帶額外內距，字級為 13px Bold。

#### Scenario: 使用者生成新物件圖層

- **WHEN** 使用者選取「加入物件」工具、輸入物件描述並點擊「生成物件」
- **THEN** 在選取範圍建立一個新的物件圖層，圖層清單同步更新，且不扣飼料

#### Scenario: 使用者點選常用物件預設

- **WHEN** 使用者點選「花束」「綠植」「杯盤」「陰影」「裝飾字卡」等預設
- **THEN** 對應文字加入物件描述輸入框，可再自行編輯

#### Scenario: 描述框字數上限與畫布框選樣式對齊設計稿

- **WHEN** 使用者輸入物件描述，或在畫布上框選生成範圍
- **THEN** 描述框 SHALL 最多輸入 200 字並即時顯示字數；畫布框選範圍 SHALL 顯示淡藍色底色與 6px 圓角虛線框，範圍下方提示氣泡 SHALL 為 6px 圓角、11px Medium 白字

#### Scenario: 面板子項目間距統一

- **WHEN** 使用者開啟「加入物件」面板
- **THEN** 標題、描述框、字數計數、預設列、提示文字、按鈕之間 SHALL 統一保持 10px 間距；字數計數與預設列各自共用樣式帶的負邊距／額外邊距 SHALL 在此面板歸零，不與統一間距疊加；標題文字（`h3`）SHALL 不帶 `aside.layers` 共用樣式帶來的內距與最小高度，字級為 13px Bold

<!-- @trace
source: fix-mv09-editor-figma-mismatches, fix-mv09-add-object-panel
updated: 2026-09-03
code:
  - src/components/ImageEditorWorkspace.vue
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
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
