## Why

飼料用量頁（MV-06 用量統計／MV-07 AI 表現指標）整頁寫死：期間、每日資料、四格模組、四張指標卡都是常數，「匯出」的 CSV 也是假資料；首頁「本月已生成」讀 mock 的 `generatedThisMonth`，「可生成張數」用寫死的單價 8／45 估算。後端 feat/mv-07-metrics 已有 `GET /feeds`（完整錢包摘要）、`GET /feeds/usage`、`GET /metrics` 三支契約（以 app/routers/feeds.py、app/routers/metrics.py、app/schemas/feed.py、app/schemas/period.py、app/schemas/metrics.py 為準），前端照契約接上，畫面上的數字才是真的。

## What Changes

- API 層：`realApi` 新增 `getUsage(params)`（`GET /feeds/usage`）與 `getMetrics(params)`（`GET /metrics`）；`getFeed` 改回完整欄位（`balance`、`monthlyLimit`、`monthUsed`、`estImages`、`estVideos`）。mock 三支改成同一形狀。
- feed store 除 `balance` 外新增 `monthlyLimit`／`monthUsed`／`estImages`／`estVideos`，`refresh` 一次寫入。
- 用量統計分頁：額度區塊改「本月已用 X／上限 Y」（無上限顯示「無上限」、不顯示剩餘），另一行錢包餘額；告警線＝月上限 × 80%，沒設上限不畫；「預計用罄」＝(上限 − 已用) ÷ 日均，無上限或日均 0 顯示「—」；趨勢圖只畫實際累積與每日長條，拿掉預測曲線與「上月同期」；依模組卡片照後端回傳清單渲染（名稱走 i18n 對照、對不到顯示 key、顏色照固定色盤依序指派）；CSV 匯出真的每日與模組資料；趨勢與模組卡各打一次 `GET /feeds/usage`（`groupBy=day`／`groupBy=module`，平行）；載入失敗顯示既有的 `role="alert"` 錯誤文字。
- 自訂區間：送瀏覽器時區（`Intl.DateTimeFormat().resolvedOptions().timeZone`）；跨度超過 366 天由日曆面板擋下並提示；日曆預設「今天往前 30 天」。
- AI 表現指標分頁：同一組期間 chip 送 `GET /metrics`，四卡的值為 `null` 時顯示「—」；較前期文案依欄位單位（「較前期 +1.8 個百分點／+0.2 次／−0.4 顆」）；移除「需前端埋點」的提示區塊。
- 首頁：「本月已生成 N 張」改為「本月已用 N 顆飼料」（`GET /feeds` 的 `monthUsed`）；「可生成約 N 張／N 支」改讀 `estImages`／`estVideos`。
- **BREAKING（前端內部介面）**：`UsageSummary` 與 `Metrics` 型別改成後端欄位形狀（`avgRegen` → `avgRegenerate`），`getUsage`／`getMetrics` 改為必帶期間參數，`getFeed` 回傳 `FeedSummary`。
- 移除本 change 後確定無人使用的寫死常數與 i18n 字串（預測、上月同期、埋點說明、模組示意值註記）。

## Non-Goals (optional)

- 不接 `PUT /feeds/limit`（設定月上限）與 `POST /feeds/topup`。
- 不動 `src/components/ImageEditorWorkspace.vue`。
- 不改趨勢圖的繪圖方式（維持手刻 inline SVG，只換資料來源）。
- 不做 `botId` 篩選（`GET /feeds/usage` 的選填參數）。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `usage-stats-ui`: 額度量表改讀 `GET /feeds` 的本月已用／月上限；燃盡圖改讀 `GET /feeds/usage` 的每日資料、拿掉預測；模組分佈照後端清單渲染；自訂區間跨度上限 366 天、送瀏覽器時區、預設今天往前 30 天；CSV 匯出真資料；載入失敗顯示錯誤。
- `ai-metrics-ui`: 四項指標改讀 `GET /metrics`，`null` 顯示「—」，較前期文案依單位；移除「需前端埋點」的要求。
- `home-workbench-ui`: 狀態列第二格改為「本月已用飼料」，可生成估算改讀後端 `estImages`／`estVideos`。

## Impact

- Affected specs: `usage-stats-ui`、`ai-metrics-ui`、`home-workbench-ui`
- Affected code:
  - Modified:
    - src/types/api.ts
    - src/api/real.ts
    - src/api/real.spec.ts
    - src/api/mock.ts
    - src/api/mock.spec.ts
    - src/stores/feed.ts
    - src/stores/stores.spec.ts
    - src/views/UsageView.vue
    - src/views/HomeView.vue
    - src/lang/zh-Hant.ts
    - src/lang/en.ts
  - Removed:
    - src/assets/images/usage-legend-forecast.svg
