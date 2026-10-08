## Why

Figma 節點 `12:48`（MV-03 行銷 PO 文設定區 `panel_config`）新增了「要產出什麼」區塊（node `1438:680`），讓使用者在生成前選擇輸出內容類型（文案＋配圖／只要文案／只要配圖），三者飼料成本不同。目前 `MarketingPostView.vue` 沒有這個選擇，永遠同時產出圖與文案，也永遠顯示固定「預估消耗 5 顆飼料」，與新設計稿不符，使用者無法選擇只重做文案或只重做配圖以節省飼料。

## What Changes

- 在「1. 選擇商品圖片」之前新增「要產出什麼」分段選擇器（segmented control），三個選項：「文案＋配圖」（預設選取，5 顆）、「只要文案」（2 顆）、「只要配圖」（3 顆），每個選項顯示飼料圖示與顆數，文字與飼料數比照 Figma 節點 `1438:682` 逐字對齊。
- 選擇器下方新增提示文字「分開產出的好處：之後只重做其中一項，不必兩項都重扣。」（Figma 節點 `1438:725`）。
- 設定區底部「預估消耗」的飼料顆數 SHALL 依所選輸出類型（5／2／3）動態顯示，取代目前寫死的 5 顆。
- 結果區 SHALL 依所選輸出類型呈現對應內容：「文案＋配圖」維持現有左右兩欄（圖＋文案）；「只要文案」只呈現文案欄（含複製／重寫）；「只要配圖」只呈現貼圖欄（含換一張圖／下載）。
- `GeneratePostReq`（`src/types/api.ts`）新增輸出類型欄位，`api.generatePost`（`src/api/mock.ts`）依欄位回傳對應內容（只要文案時不回傳 `posterUrl`；只要配圖時 `copy`／`hashtags` 回傳空），並將目前寫死的 `deduct(12)` 改為依輸出類型對應 5／2／3 顆，修正現有「畫面顯示 5 顆、實際扣 12 顆」的不一致。
- 新增的 UI 文字同時補齊 `src/lang/en.ts` 與 `src/lang/zh-Hant.ts`，兩邊 key 結構一致。

## Capabilities

### Modified Capabilities

- `marketing-post-ui`: 新增「選擇輸出內容類型」需求（要產出什麼分段選擇器），並修改既有「生成貼文標示飼料消耗」（飼料顆數改為依輸出類型動態顯示）與「結果區呈現圖與文案兩欄」（新增依輸出類型呈現單欄的情境）需求。

## Impact

- Affected specs: `marketing-post-ui`
- Affected code:
  - Modified:
    - src/views/MarketingPostView.vue
    - src/types/api.ts
    - src/api/mock.ts
    - src/api/mock.spec.ts
    - src/lang/en.ts
    - src/lang/zh-Hant.ts
