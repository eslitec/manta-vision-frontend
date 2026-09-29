## Why

使用者回報：「生成文+圖片沒有在任務裡面出現」。右上角「任務」面板（`TaskCenterPanel.vue`）讀的是前端 store `src/stores/generationTasks.ts`，目前只有圖生圖（`createImageTask`）與圖生影（`createVideoTask`）寫入；`MarketingPostView.vue` 直接呼叫 `api.generatePost`，完全沒有寫入 store，所以行銷 PO 文不論哪種輸出類型都不會出現在任務面板，也不會亮任務徽章。

排查時另外發現同一個 store 的既有缺陷：`createImageTask` 把任務物件 `unshift` 進陣列後，改的是**原物件**而不是陣列裡的 reactive proxy，於是圖生圖完成時任務徽章不會變成未讀、開著的面板會一直停在「進行中」。行銷任務要走同一條路徑，必須一起修。

## What Changes

- store 新增 `createMarketingTask`：包住頁面原本的 `api.generatePost` 呼叫（請求內容、Idempotency-Key、扣點、202 輪詢、存入圖庫全部不動），配圖與文案**一半記一筆任務**（「文案＋配圖」＝兩筆；「只要文案」「只要配圖」＝一筆），各自從進行中變成完成或失敗。
- 失敗的行銷任務在面板顯示與頁面同一句錯誤訊息；只成功一半時，成功那筆標完成、失敗那筆標失敗並帶原因。
- 行銷任務在面板**不顯示重試鈕**（結果只活在行銷頁元件裡，從面板重做會扣點卻看不到結果），重做沿用頁面既有的「換一張圖／重寫文案」。
- 任務名稱為「行銷海報圖_<海報文字前 12 字>」「行銷文案_<商品介紹前 12 字>」，類型名與用量統計的 `usage.modules.items.marketingImage／marketingText` 一致；完成文案說明結果不會自動存入圖庫、要回行銷頁存入或複製。
- 圖生圖與行銷共用新的 `addTask`／`finish`（改 reactive proxy），順帶修掉圖生圖徽章與面板不更新的缺陷。
- 面板頁尾說明「圖生圖請留在頁面上等結果」改為「圖生圖與行銷 PO 文請留在頁面上等結果」。
- 新字串同步補 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts`。

## Capabilities

### Modified Capabilities

- `marketing-post-ui`: 新增「行銷 PO 文生成列入任務中心」「行銷任務失敗顯示原因且不提供面板重試」兩個需求。
- `generate-image-ui`: 新增「圖生圖任務狀態即時反映在任務中心」需求（修正既有缺陷）。

## Impact

- Affected specs: `marketing-post-ui`、`generate-image-ui`
- Affected code:
  - Modified:
    - src/stores/generationTasks.ts
    - src/stores/stores.spec.ts
    - src/views/MarketingPostView.vue
    - src/components/TaskCenterPanel.vue
    - src/types/api.ts
    - src/lang/zh-Hant.ts
    - src/lang/en.ts
