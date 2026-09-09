## Why

使用者發現首頁與頂部工具列顯示的飼料圖示（`IconFeedBottleSmall`）點了沒有反應，追查後確認問題比預期更根本：旁邊的「儲值」按鈕（`FeedBadge.vue`、`HomeView.vue` 各有一個）本身也完全沒有掛任何 `@click` 處理，是一個外觀完整、實際上什麼都不做的按鈕，全站也沒有任何儲值頁面、彈窗或路由存在。使用者確認：這兩個地方（飼料圖示、儲值按鈕）都應該導向現有的「飼料用量」頁面（`/usage`）。

## What Changes

- `src/components/FeedBadge.vue`（顯示於頂部工具列，`DefaultLayout.vue` 內）：飼料圖示（`IconFeedBottleSmall`）與「儲值」按鈕，點擊後都導向 `/usage`
- `src/views/HomeView.vue`：首頁飼料餘額數字旁的飼料圖示、以及「＋ 儲值飼料」按鈕，點擊後都導向 `/usage`
- 兩處的圖示與按鈕都要有清楚的可點擊視覺提示（例如游標樣式、focus 狀態），並補上對應的 `aria-label`，因為圖示本身不含文字，螢幕報讀器需要額外說明「前往飼料用量頁面」

## Non-Goals

- 不新增獨立的儲值頁面或儲值彈窗；「導向同一個地方」目前指的是導向既有的「飼料用量」頁面（`/usage`），不是打造完整的付費儲值流程——那是另一個獨立、範圍大很多的功能，需要另外規劃
- 不處理其他顯示「預估花費 N 顆飼料」的成本提示位置（`GenerateImageView.vue`、`GenerateVideoView.vue`、`ImageEditorWorkspace.vue`、`ConfirmGenerateDialog.vue`、`UsageView.vue` 本身列出的用量明細）：這些位置的飼料圖示代表「這個操作預估要花多少飼料」，是成本估算，跟「使用者目前的飼料餘額」語意不同，點擊導向別的頁面會打斷使用者正在進行的操作，不在這次範圍內
- 不改變 `/usage` 頁面本身的內容或版面

## Capabilities

### Modified Capabilities

- `home-workbench-ui`：頂部工具列與首頁的飼料餘額顯示，飼料圖示與儲值按鈕改為可點擊、導向 `/usage`

## Impact

- Affected specs: home-workbench-ui
- Affected code:
  - Modified: src/components/FeedBadge.vue
  - Modified: src/views/HomeView.vue
