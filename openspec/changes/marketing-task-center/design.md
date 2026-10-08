## Context

任務面板（`TaskCenterPanel.vue`）與頂部工具列的任務徽章（`DefaultLayout.vue`）都只讀前端 store `useGenerationTasksStore`。圖生影走 `createVideoTask`（後端非同步任務＋store 輪詢），圖生圖走 `createImageTask`（頁面 await 結果，store 只記錄進行中與成敗）。行銷 PO 文的 `generate()` 直接呼叫 `api.generatePost`，所以從未進過任務面板。

真後端的 `generatePost`（`src/api/real.ts`）是**兩支獨立端點**平行送出：`POST /marketing/image`（付費，`marketingImage` 5 顆）與 `POST /marketing/text`（`marketingText` 0 顆），各自一把 Idempotency-Key、各自成敗；只成功一半時回傳成功那一半＋`partialError`，兩半都失敗才 throw。

## Goals / Non-Goals

**Goals:**

- 行銷 PO 文三種輸出類型送出後都出現在任務面板，進行中 → 完成／失敗，含名稱、狀態點、未讀徽章與完成／失敗文案，呈現方式比照圖生圖任務。
- 「文案＋配圖」讓使用者看得出兩項各自的結果。
- 不改變行銷 API 的請求內容、Idempotency-Key、扣點、存入圖庫與 202 輪詢行為。

**Non-Goals:**

- 不從任務面板重試行銷任務。
- 不把 AI 試穿、AI 修圖接進任務面板（另案）。
- 不讓行銷結果在離開頁面後仍可取回（結果只活在頁面元件，與圖生圖相同，面板頁尾照實說明）。

## Decisions

### 「文案＋配圖」一半記一筆任務

選項比較：

- 一筆任務帶兩個結果：面板要新增「部分成功」的第三種狀態（綠點還是紅點？），完成文案要拼兩段，改動面板結構。
- **兩筆任務（採用）**：後端本來就是兩支端點、各自扣點、各自成敗，一半一筆最貼近實際；每筆沿用面板既有的進行中／完成／失敗三態與錯誤文字，不必發明新狀態。代價是一次送出未讀數 +2，但兩筆名稱（「行銷海報圖_…」「行銷文案_…」）清楚區分，不會誤會。

`GenerationTaskKind` 新增 `marketingImage`、`marketingText`（對齊後端 modelKey）。`createMarketingTask(run, halves, errorText)`：頁面決定要記哪幾半（依本次送出的輸出類型；「換一張圖」「重寫文案」「只重做失敗那一半」都是只記那一半），store 在 `run()` 回來後依 `post.poster` 有無、`post.copy !== undefined` 判定每一半的成敗；`run()` 丟錯則全部標失敗。

### 失敗訊息由頁面傳入，面板不顯示重試鈕

`errorText` 直接傳頁面既有的 `failText`（飼料不足→「飼料不足」，其餘→`displayMessage`），面板與頁面講同一句。store 的 `retryTask` 只支援影片；行銷任務若在面板重試，結果會寫不回已卸載或已換輸入的頁面，等於扣點卻看不到結果，所以面板對 `marketingImage`／`marketingText` 不顯示重試鈕，重做走頁面的「換一張圖／重寫文案」。

### 圖生圖與行銷共用 addTask／finish，改 reactive proxy

`tasks` 是 `ref([])`；`unshift` 進去的是原物件，讀回來的 `tasks.value[0]` 才是 reactive proxy。原本 `createImageTask` 改的是原物件，Vue 收不到變更：`activeCount`／`unreadCount` 這兩個 computed 一旦算過就不會重算，開著的面板也停在「進行中」（bf213e7 實測：圖生圖任務完成後面板仍是 `task--processing`、徽章 0→0）。新的 `addTask` 回傳 `tasks.value[0]`，`finish` 統一設定狀態、進度、錯誤、完成時間與未讀，圖生圖與行銷共用，一次修掉。

## Risks / Trade-offs

- [取捨] 一次「文案＋配圖」在徽章上算 2 則未讀 → 兩筆名稱與完成文案各自說明是哪一半，面板一眼可辨。
- [風險] 行銷任務完成後使用者若已離開頁面，面板說「請在行銷頁按存入圖庫」但結果已不在 → 與圖生圖既有行為相同；離開頁面仍有「生成中離開」確認框，頁尾說明也改為「圖生圖與行銷 PO 文請留在頁面上等結果」。
- [行為變更] 圖生圖任務完成時徽章會變成未讀、開著的面板會即時轉為完成（修正既有缺陷，不是新功能）。
