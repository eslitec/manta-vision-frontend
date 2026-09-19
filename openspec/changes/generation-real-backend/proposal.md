## Why

圖生圖（MV-02）與行銷 PO 文（MV-03）目前只接 mock：價格寫死在前端、結果是假佔位圖、飼料餘額是 mock 的假數字，而後端 feat/mv-07-metrics 分支已經有完整的生成契約（`POST /generate`、`POST /marketing/image`、`POST /marketing/text`、`GET /generations/{id}` 輪詢、`GET /feeds`、`GET /ai-models`、`GET /inspirations`）。付費端點會實際扣點並呼叫 fal，前端必須照後端的冪等與輪詢規則送請求，否則會重複扣點或拿不到已付費的結果。

## What Changes

- `VITE_USE_MOCK=false` 時，圖生圖頁與行銷 PO 文頁的每個動作都改打真後端；沒設或不是 `false` 時，兩頁照樣用 mock 跑完整流程（mock 與 real 的方法簽名一致）。
- 付費端點（`/generate`、`/marketing/image`、`/marketing/text`）一次點擊產一把 `Idempotency-Key`，逾時上限 100 秒；只有逾時、斷線、`409 IDEMPOTENCY_IN_PROGRESS` 會用同一把 key 與同一份 body 重送。
- 收到 202 時在 API 層輪詢 `GET /generations/{id}` 直到 `done` 或 `failed`（上限 11 分鐘），view 與 `generationTasks` store 的結構不變。
- 飼料餘額改讀 `GET /feeds`，每次生成結束（不論成敗）刷新一次；真後端模式明確停用模擬儲值（`topUpFeed` 設為 `undefined`）。
- 圖生圖：檔位單價改讀 `GET /ai-models?modelType=image`、預估消耗改成單價乘張數、參考圖改為必填、請求欄位直接使用後端名稱（含 `strength` 方向翻轉、`seed` 為 0 不被丟掉、`useBrand`、`regenOf`）、結果顯示真圖、存入圖庫改打 `POST /generations/{id}/save`、下載後回報 `downloaded` 採用事件、AI 輔助描述顯示錯誤、品牌開關說明改成「品牌色票」。
- 行銷 PO 文：依輸出類型分別呼叫 `/marketing/image` 與 `/marketing/text`（兩支平行、各自一把 key）、價格改讀 `GET /ai-models?modelType=marketing`、「商品介紹」與「海報文字」拆成兩個欄位、靈感素材改讀 `GET /inspirations`、只成功一半時保留成功那一半並保留失敗那一欄的重試按鈕、海報可真的下載並回報採用。
- 新增共用下載工具，圖庫的批次下載一併改用它（HTTP 非 2xx 時顯示錯誤，不再把錯誤頁存成檔案）。
- **BREAKING（前端內部介面）**：`AiModel`、`GenerateImageReq`、`GeneratedImage`、`GeneratePostReq`、`GeneratedPost` 改成後端欄位形狀；`generateImages` 拿掉 `costPerImage` 參數；`recordAdoption` 與 `saveGenerated` 改為接收 `GenerationRef`。

## Non-Goals (optional)

範圍外項目寫在 design.md 的 Goals / Non-Goals。

## Capabilities

### New Capabilities

- `paid-generation-requests`: 付費生成請求的冪等鍵與重送規則、202 輪詢、飼料餘額讀取與刷新、真後端模式停用模擬儲值、錯誤顯示、共用下載邏輯、mock 與真後端同形。
- `generate-image-backend`: 圖生圖頁接真後端：檔位與單價、請求組裝、AI 輔助描述、結果顯示、存入圖庫、下載採用、重新生成、品牌開關說明。
- `marketing-post-backend`: 行銷 PO 文頁接真後端：價格、依輸出類型分流端點、商品介紹與海報文字兩欄、靈感素材、只成功一半與單獨重做、下載海報採用。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 paid-generation-requests、generate-image-backend、marketing-post-backend 三個 capability
- Affected code:
  - New:
    - src/utils/download.ts
    - src/utils/download.spec.ts
    - src/utils/generation.ts（審查後補：參考強度翻轉、種子解析、行銷結果合併抽成純函式）
    - src/utils/generation.spec.ts
  - Modified:
    - src/types/api.ts
    - src/api/errors.ts
    - src/api/real.ts
    - src/api/mock.ts
    - src/api/real.spec.ts
    - src/api/mock.spec.ts
    - src/stores/stores.spec.ts
    - src/composables/useAssets.ts
    - src/views/GenerateImageView.vue
    - src/views/MarketingPostView.vue
    - src/views/LibraryView.vue
    - src/components/TaskCenterPanel.vue（審查後補：圖生圖任務不宣稱已入庫）
    - src/lang/zh-Hant.ts
    - src/lang/en.ts
  - Removed: (none)
- 不改：src/api/http.ts（逾時與 `Idempotency-Key` 用 axios 的單次請求設定帶入）、src/stores/feed.ts、src/stores/generationTasks.ts、src/stores/models.ts、src/components/TopUpDialog.vue（既有「不支援」分支直接生效）
- 後端依賴：manta-vision-backend 的 feat/mv-07-metrics 分支（HEAD 6a44aaa，尚未合進 main）；後端一行都不改
