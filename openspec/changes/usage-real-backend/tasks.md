## 1. API 型別與資料層

- [x] 1.1 落地設計決策「決策 1：型別改成後端欄位形狀，real 不做欄位轉換」：`src/types/api.ts` 定義 `FeedSummary`、`PeriodParams`、`UsageQuery`、`UsageModule`、`UsageSummary`、`MetricValues`、`Metrics`；`realApi.getFeed` 回整包、新增 `getUsage(params)` 打 `/feeds/usage`、`getMetrics(params)` 打 `/metrics`，回應原樣回傳。驗證：`npx vue-tsc --noEmit` exit 0
- [x] 1.2 落地設計決策「決策 2：期間參數由 view 組、時區由 API 層補」：`realApi.getUsage`／`getMetrics` 一律附 `timezone`。驗證：`src/api/real.spec.ts` 新增 `GET /feeds/usage` 與 `GET /metrics` 測試——custom 的 query 含 `period`、`groupBy`、`startDate`、`endDate`、`timezone`；`vsLastMonthPct: null`、`daily: null` 原樣保留；`realApi.getUsage`／`getMetrics` 不是 mock 的那一份；`npx vitest run src/api/real.spec.ts` 全綠
- [x] 1.3 mock 同形：`mockApi.getFeed` 回五欄、`getUsage(params)` 依 `period`／起訖算出區間並回補 0 的 `daily` 或五格 `byModule`（`groupBy` 決定另一個為 `null`）、`getMetrics(params)` 回新形狀（含 `period`、`vsLastPeriod`、`monthGenerated`）。驗證：`src/api/mock.spec.ts` 改成對新形狀斷言，`npx vitest run src/api/mock.spec.ts` 全綠
- [x] 1.4 feed store 新增 `monthlyLimit`／`monthUsed`／`estImages`／`estVideos`，`refresh` 一次寫入、`applyTopUp` 只改 `balance`。驗證：`src/stores/stores.spec.ts` 的 feed store 測試改成 mock 五欄並斷言四個新欄位，`npx vitest run src/stores` 全綠

## 2. 用量統計分頁

- [x] 2.1 對齊 Requirement「以量表呈現本月額度使用」並落地「決策 4：額度區塊與告警線的口徑」：額度區塊讀 feed store 的 `monthUsed`／`monthlyLimit`，無上限顯示「無上限」且不畫量表、剩餘、百分比、告警；錢包餘額另一行；「預計用罄」依 (上限 − 已用) ÷ 日均 顯示天數、「已用罄」或「—」；「較前期」讀 `vsLastMonthPct`，`null` 顯示「—」；載入失敗顯示 `p[role="alert"]`。驗證：真後端瀏覽器實測截圖（該帳號無上限 → 看到「無上限」與「—」）
- [x] 2.2 對齊 Requirement「以燃盡圖呈現消耗趨勢與預測」並落地「決策 3：兩次呼叫，趨勢與模組卡各拿各的」：期間變更時平行發 `groupBy=day` 與 `groupBy=module`，用遞增序號擋過期回應；折線與長條改讀 `daily`；上限線與告警線只在有 `monthlyLimit` 時畫；移除預測曲線、預測點、預測寬度、「上月同期」、`usage-legend-forecast.svg` 與對應 i18n。驗證：瀏覽器實測用量頁載入時 Network 出現兩發 `GET /api/feeds/usage`（`groupBy=day`／`module`）與一發 `GET /api/feeds`；切 30d／90d 各再兩發
- [x] 2.3 對齊 Requirement「依模組呈現消耗分佈」並落地「決策 5：模組卡片照後端清單渲染」：照 `byModule` 渲染、名稱走 `usage.modules.items.<type>`（五個 type 兩份語系都補）、`te()` 對不到顯示 `type`、顏色固定色盤循環、`vsLastMonthPct` null 顯示「—」；移除四個 tone 修飾類與 `usage.modules.note`。驗證：瀏覽器實測看到五張卡片名稱為圖生圖／行銷海報圖／行銷文案／圖生影／AI 試穿
- [x] 2.4 對齊 Requirement「自訂區間用雙月曆面板挑選日期」並落地「決策 8：自訂區間」：`DateRangeCalendarPanel` 傳 `maxRangeDays=366`，預設起訖為今天往前 30 天到今天；套用後以 `period=custom` 帶 `startDate`、`endDate` 重新請求（時區由 API 層補）。驗證：瀏覽器實測套用自訂區間後 Network 出現 `period=custom&…&timezone=`
- [x] 2.5 落地「決策 9：CSV 匯出真資料」：匯出列為期間、期間用量、日均、每日一列、每模組一列，移除「額度上限」「剩餘飼料」兩列與對應 i18n。驗證：`exportUsage` 產出的 rows 來自 `usage.daily` 與 `modules`（程式碼審視＋ `npx vue-tsc --noEmit`）

## 3. AI 表現指標分頁與首頁

- [x] 3.1 對齊 Requirement「呈現四項 AI 表現指標」並落地「決策 6：指標卡的值與較前期文案」：切到指標分頁或切期間時發 `getMetrics(period)`；值 `null` 顯示「—」；較前期依單位用 `usage.metrics.vsLastPeriod.pct|times|feeds`，`null` 顯示「—」；載入失敗顯示 `p[role="alert"]`。驗證：瀏覽器實測指標分頁 Network 出現 `GET /api/metrics?period=30d`，卡片上看得到「—」
- [x] 3.2 處理 REMOVED Requirement「標示指標需前端埋點」：移除 `.trackingNote` 區塊、其樣式與 `usage.tracking.*`（兩份語系）。驗證：`grep -rn "usage.tracking" src` 為 0 筆
- [x] 3.3 對齊 Requirement「狀態列顯示帳號與品牌狀態」並落地「決策 7：首頁改讀 feed store」：首頁不再呼叫 `getUsage`，第二格顯示 `feed.monthUsed` 與「本月已用飼料」（`home.usedThisMonth`），估算改讀 `feed.estImages`／`feed.estVideos`，刪除寫死的 8／45 與 `home.generatedThisMonth`。驗證：瀏覽器實測首頁顯示「本月已用 N 顆」

## 4. 驗證與收尾

- [x] 4.1 `npx vitest run` 0 failed；`npx vue-tsc --noEmit`、`npx eslint .` exit 0；`npx prettier --check` 改動檔通過；i18n 兩份語系葉節點差集維持基準（zh-Hant 多 8 個 `editor.retouch.*`，en 0）
- [x] 4.2 「故意改壞會紅」實證：把 `realApi.getUsage` 的 `timezone` 拿掉後 `real.spec.ts` 對應測試轉紅，還原後轉綠（用 cp 快照到 scratchpad 還原，不用 git checkout）
- [x] 4.3 真後端瀏覽器實測（puppeteer-core，:5173 真後端模式）：用量頁兩發 `GET /api/feeds/usage` 與一發 `GET /api/feeds`；切 30d／90d／custom；指標分頁 `GET /api/metrics`；`null` 顯示「—」；無 pageerror；首頁「本月已用 N 顆」；截圖存 scratchpad/usage/；結束無殘留 headless Chrome
- [x] 4.4 `spectra validate usage-real-backend` 與 `spectra analyze usage-real-backend` 無 Critical／Warning
