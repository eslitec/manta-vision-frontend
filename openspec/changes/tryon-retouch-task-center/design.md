## Context

任務面板（`TaskCenterPanel.vue`）與頂部工具列的任務徽章（`DefaultLayout.vue`）都只讀前端 store `useGenerationTasksStore`。圖生影走 `createVideoTask`（後端非同步任務＋store 輪詢）；圖生圖走 `createImageTask`、行銷走 `createMarketingTask`，兩者都是「頁面 await 結果，store 只記錄進行中與成敗」，內部共用 `addTask`／`finish`。

AI 試穿（`POST /tryon`）與 AI 修圖（`POST /edit`，multipart）在 `src/api/real.ts` 都走同一條付費管線 `runGeneration`（冪等鍵、100 秒逾時、202 輪詢），回傳一張 `tempUrl` 結果。後端 `app/services/generation.py` 只在 `save_result`（`POST /generations/{id}/save`）建立 `Image` 列，`source` 依生成類型對照（`tryon`→`tryon`、`edit`→`edit` 並寫 `derived_from`）；試穿與修圖本身都**不會**自動存入圖庫。

## Goals / Non-Goals

**Goals:**

- AI 試穿與 AI 修圖（快速修飾、指令修圖、重新修圖）送出後都出現在任務面板，進行中 → 完成／失敗，含名稱、狀態點、未讀徽章與照實的完成說明，呈現方式比照行銷任務。
- 圖生圖、行銷、試穿、修圖收斂到同一個小 helper，不再各自複製「記任務＋收尾」。
- 不改變兩頁原本的 API 請求、Idempotency-Key、扣點、202 輪詢、結果顯示、存入／另存、下載、修圖「結果不配錯圖」保護與修圖中切分頁確認。

**Non-Goals:**

- 不從任務面板重試試穿或修圖。
- 不讓試穿／修圖結果在離開頁面後仍可從面板取回（結果只活在頁面元件，與圖生圖、行銷相同，面板頁尾照實說明）。
- 不改用量統計（`usage.modules.items`）缺 `edit` 模組名稱的既有問題。

## Decisions

### 一個 trackTask 包住所有「頁面自己 await」的生成

`trackTask(kind, name, cost, run, errorText)`：`addTask` 記一筆進行中任務 → `await run()` → `finish` 標完成並回傳結果；`run()` 丟錯則 `finish` 標失敗（帶 `errorText(e)`）後把原錯誤丟回頁面。頁面把原本那一行 `await api.xxx(...)` 原封不動包進 `run`，所以請求內容、冪等鍵、202 輪詢都不受影響；錯誤處理（試穿的 `CONSENT_REQUIRED` 開同意視窗、修圖的換圖保護）仍在頁面的 `try/catch` 裡照舊執行。

選項比較：

- 每種生成各寫一支 `createTryOnTask`／`createRetouchTask`：與 `createImageTask` 幾乎一樣，第四份複製。
- **一個泛型 `trackTask`（採用）**：圖生圖直接改呼叫它（`createImageTask` 移除）；行銷的「一半一筆」改為對每一半呼叫一次 `trackTask`，`run` 是「等同一個 `generatePost` promise、這一半沒結果就丟 `partialError`」，整次失敗由 `createMarketingTask` 把原 promise 的錯誤交還頁面。行銷原有的四條 store 測試不改就全綠。

`createImageTask` 原本會把結果存到 `GenerationTask.resultImages`，但全專案沒有任何讀取端，改用泛型 helper 後一併移除這個欄位。

### 完成說明照後端行為寫，不說「已存入圖庫」

面板完成狀態改為：影片沿用 `taskCenter.completed`（自動入庫）；其餘一律取 `taskCenter.<kind>Completed`。新增：

- `tryonCompleted`：「已完成・結果不會自動存入圖庫，請在 AI 試穿頁按「存入圖庫」」（按鈕文字＝`common.saveToLibrary`）。
- `retouchCompleted`：「已完成・結果不會自動存入圖庫，請到圖庫「AI 修圖」按「另存為新素材」」（分頁＝`library.tabs.retouch`、按鈕＝`editor.saveAsNew`）。

面板說明原本最多兩行（`-webkit-line-clamp: 2`），手機 360 寬與英文介面仍會截掉句尾的按鈕名；9/29 改為不設行數上限、完整換行，並給 `.task` 加 `flex-shrink: 0`（列表是會捲動的直向 flex，列會被壓回 min-height 而讓說明疊到下一列）。修圖說明仍維持縮短後的版本。

任務名稱前綴與既有 i18n 一致：「AI 試穿」＝`sources.tryon`／`usage.modules.items.tryon`，「AI 修圖」＝`library.tabs.retouch`。試穿用服飾素材名、修圖用來源素材名（重新修圖的來源素材不變，名稱相同）。

### 失敗訊息由頁面傳入，面板不顯示重試鈕

兩頁各抽出一個 `failText`（飼料不足→「飼料不足，請先儲值。」，其餘→`displayMessage`），同時給頁面錯誤與 `trackTask` 的 `errorText`，面板與頁面講同一句。試穿遇到 `CONSENT_REQUIRED` 時頁面照舊開同意視窗、不顯示錯誤，任務則顯示後端訊息「尚未同意肖像使用條款」。面板的重試鈕本來就只給影片（`retryTask` 只處理影片），不需改動。

## Risks / Trade-offs

- [風險] 修圖途中若素材被換掉（照理不會發生：修圖中兩個分頁的換圖按鈕都停用），頁面顯示「結果屬於先前那張」而不寫入畫面，但任務仍標完成、完成說明叫人去按「另存為新素材」→ 保護邏輯刻意不動；此情況下結果已不在畫面上，屬已知限制。
- [風險] 任務完成後使用者若已離開頁面，面板的完成說明指向的結果已不在 → 與圖生圖、行銷既有行為相同；兩頁離開時本來就有「生成中離開」確認，頁尾也說明「其他生成請留在頁面上等結果」。
- [取捨] 移除 `createImageTask` 改名為 `trackTask`：唯一的呼叫端 `GenerateImageView.vue` 兩處一起改，參數順序改成 `(kind, name, cost, run, errorText)`。
