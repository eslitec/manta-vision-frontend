# usage-stats-ui Specification

## Purpose

TBD - created by archiving change 'sync-mv-06-design'. Update Purpose after archive.

## Requirements

### Requirement: 以量表呈現本月額度使用

用量統計 SHALL 以環狀量表呈現本月已用 / 上限與百分比，並標出目前進度、月底預測與告警門檻。

#### Scenario: 使用者檢視額度量表

- **WHEN** 使用者開啟用量統計
- **THEN** 顯示「本月額度使用 3,760 / 5,000 顆・75%」量表，並標出今天、預測月底、告警門檻 80%

<!-- @trace
source: sync-mv-06-design
updated: 2026-08-21
code:
  - src/views/UsageView.vue
  - src/utils/usage.ts
  - src/components/KpiCard.vue
-->

---

### Requirement: 以燃盡圖呈現消耗趨勢與預測

用量統計 SHALL 顯示燃盡圖，包含實際累積、預測線、告警門檻與額度上限標線，並附圖例。

#### Scenario: 預測即將越過告警門檻

- **WHEN** 依近 7 日均消耗推估月底用量越過 80% 告警門檻
- **THEN** 圖上顯示越線的預測，並以文字提示預估越線日與月底用量

<!-- @trace
source: sync-mv-06-design
updated: 2026-08-21
code:
  - src/views/UsageView.vue
  - src/utils/usage.ts
  - src/components/KpiCard.vue
-->

---

### Requirement: 依模組呈現消耗分佈

用量統計 SHALL 列出各模組（圖生圖／行銷 PO 文／圖生影／AI 試穿）的消耗量、占比、較上月變化與平均每次消耗。

#### Scenario: 使用者檢視模組消耗

- **WHEN** 使用者檢視「依模組消耗」
- **THEN** 每個模組顯示消耗顆數、占比％、較上月％與平均顆數／次

<!-- @trace
source: sync-mv-06-design
updated: 2026-08-21
code:
  - src/views/UsageView.vue
  - src/utils/usage.ts
  - src/components/KpiCard.vue
-->

---

### Requirement: 自訂區間用雙月曆面板挑選日期

用量統計的「自訂」區間 SHALL 提供一個雙月曆日期區間挑選面板（對齊 Figma `panel_calendar`，node `1151:862`），取代單純的原生日期輸入框；面板 SHALL 顯示開始／結束日期框、左右並排兩個可各自導覽上下月的月曆、四個快速選取（過去 7 天／上個月／本季／今年至今）與取消／套用動作，且只有在使用者按下「套用」時才會真正套用新的區間。

#### Scenario: 開啟自訂區間面板

- **WHEN** 使用者點擊「自訂」區間 chip，或再次點擊已顯示目前區間的觸發按鈕
- **THEN** 在觸發按鈕下方浮出雙月曆面板（白底、`#d2d5dd` 邊框、12px 圓角、`0 8px 12px rgba(0,0,0,.16)` 陰影）

#### Scenario: 點選日期建立區間

- **WHEN** 使用者在月曆上點選一個日期，且目前草稿還沒有完整的起訖區間
- **THEN** 該日期成為草稿起點；若再點選一個不早於起點的日期，則成為草稿訖點；若點選的日期早於已選起點，則兩者互換（訖點永遠不早於起點）

#### Scenario: 日期格依是否在選取區間內呈現不同樣式

- **WHEN** 面板顯示月曆日期格
- **THEN** 起訖兩端的日期格 SHALL 顯示深藍（`$blue-dark-500`）底、白色粗體文字、8px 圓角；區間內（不含起訖）的日期格 SHALL 顯示淺藍（`$blue-light`）底、深藍文字、不帶圓角（讓相鄰格子的底色連成一條）；不在選取區間內的日期格 SHALL 顯示灰色（`$gray-100`）文字、無底色

#### Scenario: 快速選取自動帶出區間並套用有效性檢查

- **WHEN** 使用者點擊「過去 7 天」「上個月」「本季」或「今年至今」任一 chip
- **THEN** 面板 SHALL 依實際日期算出對應區間，把草稿起訖設為該區間，並把月曆導覽跳到起始月份

#### Scenario: 套用或取消

- **WHEN** 草稿起訖皆已選取且區間跨度不超過 365 天，使用者按下「套用」
- **THEN** 面板 SHALL 把最終起訖交還給頁面（觸發既有的自訂區間更新流程）並關閉面板；**WHEN** 草稿起訖任一為空或區間跨度超過 365 天，「套用」按鈕 SHALL 停用；**WHEN** 使用者按下「取消」、點擊面板以外的地方或按下 Escape，面板 SHALL 直接關閉，不套用任何變更

<!-- @trace
source: sync-mv-06-design, fix-usage-daterange-panel
updated: 2026-09-03
code:
  - src/components/DateRangeCalendarPanel.vue
  - src/views/UsageView.vue
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->
