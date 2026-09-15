# ai-metrics-ui Specification

## Purpose

TBD - created by archiving change 'sync-mv-07-design'. Update Purpose after archive.

## Requirements

### Requirement: 呈現四項 AI 表現指標

AI 表現指標 SHALL 呈現生成成功率、採用率、平均重生成次數與每採用素材成本，各附一句說明其定義。

#### Scenario: 使用者檢視表現指標

- **WHEN** 使用者切到「AI 表現指標」
- **THEN** 顯示生成成功率（96.2%）、採用率（68.4%）、平均重生成（1.7 次）、每採用素材成本（6.1 Tokens，帶飼料圖示）

<!-- @trace
source: sync-mv-07-design
updated: 2026-08-21
code:
  - src/views/UsageView.vue
  - src/utils/usage.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 採用相關指標僅計圖生圖

採用率、平均重生成、每採用素材成本 SHALL 只計算圖生圖（其他模組無採用概念）；生成成功率為全模組。

#### Scenario: 使用者檢視採用率定義

- **WHEN** 使用者檢視採用率
- **THEN** 說明其僅計圖生圖、以被下載或存入圖庫為採用

<!-- @trace
source: sync-mv-07-design
updated: 2026-08-21
code:
  - src/views/UsageView.vue
  - src/utils/usage.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 標示指標需前端埋點

畫面 SHALL 說明這四項指標需前端埋點（生成成功／失敗事件、採用事件…）才能準確取得，避免誤解為已接真實數據。

#### Scenario: 使用者檢視指標區塊

- **WHEN** 使用者檢視 AI 表現指標
- **THEN** 顯示需前端埋點的說明

<!-- @trace
source: sync-mv-07-design
updated: 2026-08-21
code:
  - src/views/UsageView.vue
  - src/utils/usage.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->
