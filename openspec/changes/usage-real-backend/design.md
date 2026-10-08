## Context

`src/views/UsageView.vue` 目前完全不打 API：`presetConfig` 寫死三個期間的起訖與用量，`makeDaily` 用正弦權重編出每日資料，模組四格與四張指標卡是常數，`exportUsage` 輸出的也是這些假數字。首頁 `HomeView.vue` 用 `api.getUsage().generatedThisMonth` 與寫死單價估「可生成張數」。`realApi.getFeed` 只取 `balance`，feed store 也只存 `balance`。

後端契約（feat/mv-07-metrics）：

- `GET /feeds`（帳號層）：`{ balance, monthlyLimit: int|null, monthUsed, estImages, estVideos }`。`monthUsed` 是台北日曆月內已結清的支出。
- `GET /feeds/usage`（帳號層）：query `period`（`month|30d|90d|custom`，必填）、`groupBy`（`day|module`，必填）、`startDate`／`endDate`（`custom` 必填，含頭含尾、跨度 ≤ 366 天否則 400）、`timezone`（IANA，預設 `Asia/Taipei`；`month` 一律台北）。回 `{ period: { from, to }, totalUsed, dailyAvg, vsLastMonthPct: int|null, byModule: [...]|null, daily: [{ date, used }]|null }`。`vsLastMonthPct` 比的是「前一個等長區間」，前期 0 回 `null`；`daily` 缺日由後端補 0；`byModule` 固定五格 `generate`／`marketingImage`／`marketingText`／`video`／`tryon`，每格 `{ type, used, sharePct, vsLastMonthPct: int|null, avgPerGen }`。
- `GET /metrics`（機器人層，`X-Bot-Id` 由 http 層自動帶）：query 同上的期間三兄弟。回 `{ period, successRate, adoptionRate, avgRegenerate, costPerAdopted, vsLastPeriod: { 同四欄 }, monthGenerated }`，四指標與 `vsLastPeriod` 各欄皆可 `null`（分母 0）；`vsLastPeriod` 是**絕對差**（百分點／次／顆），不是變化率。

## Goals / Non-Goals

**Goals:**

- 用量統計、AI 表現指標、首頁三處的數字全部來自後端，mock 與 real 同形。
- 期間選擇器的規則與後端一致（`custom` 跨度 ≤ 366 天、送瀏覽器時區）。
- 載入失敗時看得到錯誤，不吞。

**Non-Goals:**

- 不接 `PUT /feeds/limit`、`POST /feeds/topup`、`botId` 篩選。
- 不重做趨勢圖繪法，維持 inline SVG。
- 不動 `ImageEditorWorkspace.vue`。

## Decisions

### 決策 1：型別改成後端欄位形狀，real 不做欄位轉換

`src/types/api.ts` 的 `UsageSummary`／`Metrics` 重定型別為後端回應的 camelCase 形狀，另新增 `FeedSummary`、`UsageModule`、`PeriodParams`、`UsageQuery`、`MetricValues`。對照：

| 前端型別 | 後端 schema | 備註 |
| --- | --- | --- |
| `FeedSummary { balance, monthlyLimit, monthUsed, estImages, estVideos }` | `FeedBalanceResponse` | `monthlyLimit: number \| null` |
| `PeriodParams { period, startDate?, endDate?, timezone? }` | `PeriodQuery` | `period: 'month' \| '30d' \| '90d' \| 'custom'`；前端 chip 值 `month|days30|days90|custom` 在 view 內對照 |
| `UsageQuery extends PeriodParams { groupBy: 'day' \| 'module' }` | `FeedUsageQuery` | 不送 `botId` |
| `UsageSummary { period, totalUsed, dailyAvg, vsLastMonthPct, byModule, daily }` | `FeedUsageResponse` | `byModule`／`daily` 二選一，另一個 `null` |
| `UsageModule { type, used, sharePct, vsLastMonthPct, avgPerGen }` | `UsageModule` | |
| `MetricValues { successRate, adoptionRate, avgRegenerate, costPerAdopted }` | 四指標欄位 | 每欄 `number \| null` |
| `Metrics extends MetricValues { period, vsLastPeriod: MetricValues, monthGenerated }` | `MetricsResponse` | 舊 `avgRegen` 改名 `avgRegenerate` |

`realApi.getUsage`／`getMetrics` 的回應直接回傳 `data`，不加一層轉換：欄位名已同名，多一層 `toX` 只是多一處會跟契約分岔的地方。`realApi.getFeed` 回整包 `data`。

### 決策 2：期間參數由 view 組、時區由 API 層補

view 只產 `PeriodParams`（chip → `period`，custom 帶 `startDate`／`endDate`）。`realApi.getUsage`／`getMetrics` 一律補 `timezone: Intl.DateTimeFormat().resolvedOptions().timeZone`——後端對 `month` 忽略時區、對 `30d`／`90d`／`custom` 用它算「今天」與每日分組，永遠送比只在 custom 送更貼近使用者看到的日曆；`real.spec.ts` 釘住 custom 帶日期與時區。mock 不看時區。

### 決策 3：兩次呼叫，趨勢與模組卡各拿各的

用量分頁一次期間變更同時發 `getUsage({ ...period, groupBy: 'day' })` 與 `getUsage({ ...period, groupBy: 'module' })`（`Promise.all`），趨勢圖讀前者的 `daily`，模組卡讀後者的 `byModule`；頂層四欄（`period`／`totalUsed`／`dailyAvg`／`vsLastMonthPct`）取 `day` 那一份。指標分頁只發 `getMetrics(period)`。用一個遞增序號擋掉過期回應（切換太快時舊回應不得覆蓋新資料）。

### 決策 4：額度區塊與告警線的口徑

- 「本月已用 X／上限 Y」讀 feed store 的 `monthUsed`／`monthlyLimit`（台北日曆月，與所選期間無關）；`monthlyLimit` 為 `null` 時顯示「無上限」、不畫量表、不顯示剩餘與百分比。
- 告警門檻固定 80%：`monthUsed / monthlyLimit ≥ 80%` 顯示既有的 `alertExceeded`，≥ 75% 顯示 `alertApproaching`（沿用 `getUsageAlertLevel`）。無上限時不顯示告警。
- 趨勢圖的上限線與告警線只在 `monthlyLimit` 有值時畫（y 軸最大值取 `max(monthlyLimit, 累積總量)`）；預測曲線、預測點、預測寬度、「上月同期」全部移除。
- 「預計用罄」＝`ceil((monthlyLimit − monthUsed) / dailyAvg)` 天；無上限或 `dailyAvg` 為 0 顯示「—」；已用達上限顯示「已用罄」。`dailyAvg` 是所選期間的日均（`GET /feeds/usage` 回的），不另算。
- 「較前期」＝`vsLastMonthPct`，`null` 顯示「—」，否則帶正負號的百分比。錢包餘額另一行讀 feed store 的 `balance`。

### 決策 5：模組卡片照後端清單渲染

`byModule` 有幾格畫幾格、順序照後端。名稱用 `usage.modules.items.<type>`（`generate`／`marketingImage`／`marketingText`／`video`／`tryon`），`te()` 對不到就顯示 `type` 原字串。顏色用固定色盤 `['#2e3567', '#606692', '#ea903a', '#54c14f', '#7f77dd']` 依索引循環指派（inline style），刪掉原本依 tone 的四個 CSS 修飾類。`vsLastMonthPct` 為 `null` 顯示「—」且不上色。

### 決策 6：指標卡的值與較前期文案

| 卡 | 值 | 較前期 |
| --- | --- | --- |
| 生成成功率 | `successRate.toFixed(1)%` | `較前期 {delta} 個百分點` |
| 採用率 | `adoptionRate.toFixed(1)%` | `較前期 {delta} 個百分點` |
| 平均重生成次數 | `avgRegenerate.toFixed(1) 次` | `較前期 {delta} 次` |
| 每採用素材成本 | `costPerAdopted.toFixed(1)`（帶飼料圖示） | `較前期 {delta} 顆` |

任何欄位 `null` → 顯示「—」（值與較前期各自判斷）。`delta` 帶正負號、一位小數（`+1.8`／`−0.4`，負號用 U+2212）。「需前端埋點」提示區塊與 `usage.tracking.*` 字串移除。

### 決策 7：首頁改讀 feed store

首頁不再呼叫 `getUsage`：「本月已用 N 顆飼料」讀 `feed.monthUsed`；「≈ 可生成 N 張圖 / N 支短影片」讀 `feed.estImages`／`feed.estVideos`，寫死的 8／45 刪除。`home.generatedThisMonth` 改名 `home.usedThisMonth`（文案「本月已用飼料」），單位用既有 `units.feedShort`。

### 決策 8：自訂區間

`DateRangeCalendarPanel` 的 `maxRangeDays` 由預設 365 改傳 366（與後端含頭含尾的上限一致），面板既有的「最長可選 {days} 天」提示與停用「套用」就是前端的擋與提示。日曆預設 `start = 今天 − 30 天`、`end = 今天`（本地日期），取代寫死的 2026-07。

### 決策 9：CSV 匯出真資料

匯出列：期間、期間用量、日均；空列；「日期,消耗飼料」＋每日一列；空列；「模組,消耗飼料,占比」＋每模組一列。移除「額度上限」「剩餘飼料」兩列（那是月口徑，跟所選期間對不上）。

## Implementation Contract

- 行為：開啟用量頁 → 看到 `GET /api/feeds/usage?period=month&groupBy=day&timezone=…` 與 `…&groupBy=module&…` 各一發、`GET /api/feeds` 一發；切 chip 各再兩發；切「AI 表現指標」→ `GET /api/metrics?period=30d&timezone=…` 一發。任一請求失敗 → 該分頁顯示 `p[role="alert"]` 的錯誤文字（`displayMessage(e, t('errors.loadFailed'))`），不清空上一筆成功資料。
- 介面：`api.getFeed(): Promise<FeedSummary>`；`api.getUsage(params: UsageQuery): Promise<UsageSummary>`；`api.getMetrics(params: PeriodParams): Promise<Metrics>`。feed store：`balance`、`monthlyLimit`、`monthUsed`、`estImages`、`estVideos`、`loaded`、`refresh()`、`applyTopUp()`（只改 `balance`）。
- 驗收：
  - `npx vitest run` 0 failed；`npx vue-tsc --noEmit`、`npx eslint .` exit 0；`npx prettier --check` 改動檔通過。
  - `src/api/real.spec.ts` 新增：`getUsage` custom 的 query 含 `period=custom`、`startDate`、`endDate`、`groupBy`、`timezone`；回應原樣回傳（`vsLastMonthPct: null`、`daily: null` 不被改成 0 或空陣列）；`getMetrics` 打 `/metrics` 且回應原樣；`realApi.getUsage`／`getMetrics` 不是 mock 的那一份。
  - i18n：`zh-Hant.ts` 與 `en.ts` 葉節點 key 差集維持基準（zh-Hant 多 8 個 `editor.retouch.*`，en 0）。
  - 真後端瀏覽器實測：用量頁兩發 `GET /api/feeds/usage` 與一發 `GET /api/feeds`；切 30d／90d／custom；指標分頁 `GET /api/metrics`；`null` 顯示「—」；無 pageerror；首頁顯示「本月已用 N 顆」。
- 範圍：只動 Impact 列的檔案；不動 `ImageEditorWorkspace.vue`；不接儲值與月上限設定。

## Risks / Trade-offs

- `vsLastMonthPct` 欄位名帶「Month」但語意是前一個等長區間，文案一律寫「較前期」避免誤導。
- 趨勢圖的上限線是月口徑，選 90 天時累積量可能遠超上限線；照定案仍在有上限時畫出，不另做期間判斷。
- mock 的 `getUsage` 依 `params` 算出區間與補 0 的每日資料，數字為示意值，只保證形狀與 real 一致。
