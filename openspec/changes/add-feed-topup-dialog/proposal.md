## Why

頂部工具列與首頁的飼料圖示／「儲值」按鈕目前只是導向「飼料用量」頁面（`/usage`）——因為當時完全沒有任何儲值畫面存在（見 `link-feed-balance-to-usage` 這個 change 的記錄）。使用者現在要求做出真正的「儲值」畫面：選擇飼料套餐，點擊後立即增加餘額（模擬交易，先不接真實付款，因為真後端目前完全沒有付款/儲值端點）。

## What Changes

- 新增共用元件 `src/components/TopUpDialog.vue`：彈出式視窗（不是獨立頁面），列出 3 個固定飼料套餐（500／1500／3000 顆），使用者點選套餐卡片標記選取狀態；未選取任何套餐時「確認儲值」按鈕 disable
- 使用者點選套餐後按「確認儲值」，呼叫新增的 mock-only API `topUpFeed(packageId)`（只在 `src/api/mock.ts` 實作），立即把套餐點數加進飼料餘額並回傳新餘額
- 送出成功後，彈窗顯示成功狀態（例如「已儲值 N 顆！」），畫面上（頂部工具列與首頁）顯示的飼料餘額同步更新為新數字；使用者按「完成」按鈕關閉彈窗
- `src/components/FeedBadge.vue`（頂部工具列）與 `src/views/HomeView.vue`（首頁）的飼料圖示、「儲值」／「＋ 儲值飼料」按鈕，點擊行為從「導向 `/usage`」改成「開啟 `TopUpDialog`」
- 彈窗遵循專案既有的無障礙彈窗慣例（`Teleport(to="body")` ＋ `useAccessibleDialog` composable），比照 `ConfirmGenerateDialog.vue` 的互動複雜度（選取狀態→確認按鈕→送出）

## Non-Goals

- 不串接任何真實金流／付款方式（信用卡、Line Pay 等）；`topUpFeed` 只在 `src/api/mock.ts` 實作，SHALL NOT 在 `src/api/real.ts` 新增對應的真後端 API 呼叫——真後端目前完全沒有付款端點，勉強加一個會打到不存在的路由。這個功能因此只在 `VITE_USE_MOCK=true`（本機開發／mock 模式）下可用；等之後真的要接金流時，由後端訂出真正的合約再回頭補上 `real.ts` 的實作，那是範圍大很多的獨立工作
- 不新增獨立的「儲值」路由/頁面
- 不改變「飼料用量」（`/usage`）頁面本身的任何內容
- 不做套餐方案的後台管理介面——套餐數量與名稱這次先寫死在前端程式碼裡
- 不處理其他顯示「預估花費 N 顆飼料」的成本提示位置（`GenerateImageView.vue`、`GenerateVideoView.vue`、`ImageEditorWorkspace.vue`、`ConfirmGenerateDialog.vue`、`UsageView.vue` 自己列出的用量明細）——那些代表操作成本估算，跟這次「使用者主動儲值」的入口是不同情境，這次不動

## Capabilities

### New Capabilities

- `feed-topup-dialog`：使用者可以透過彈出式視窗選擇飼料套餐、模擬儲值交易並即時看到餘額更新

## Impact

- Affected specs: feed-topup-dialog
- Affected code:
  - New: src/components/TopUpDialog.vue
  - Modified: src/components/FeedBadge.vue
  - Modified: src/views/HomeView.vue
  - Modified: src/api/mock.ts
  - Modified: src/types/api.ts
  - Modified: src/stores/feed.ts
  - Modified: src/lang/zh-Hant.ts
  - Modified: src/lang/en.ts
