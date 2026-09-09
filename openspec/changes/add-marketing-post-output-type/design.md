## Context

MV-03 行銷 PO 文設定區（`src/views/MarketingPostView.vue`）目前固定產出「圖＋文案」，`generate()` 呼叫 `api.generatePost()` 不分輸出類型，`api/mock.ts` 的 `generatePost` 也永遠 `deduct(12)`，與畫面上顯示的「預估消耗 5 顆飼料」（`t('units.feed', { count: 5 })`，寫死在 template）本來就不一致。Figma 節點 `12:48` 新增「要產出什麼」分段選擇器（node `1438:680`），提供三種輸出類型與各自飼料成本：文案＋配圖 5 顆、只要文案 2 顆、只要配圖 3 顆，並附說明文字「分開產出的好處：之後只重做其中一項，不必兩項都重扣。」（node `1438:725`）。此設計需同時修正既有飼料數顯示與扣款的落差。

## Goals / Non-Goals

**Goals:**

- 新增「要產出什麼」分段選擇器，選項與飼料成本逐字對齊 Figma 節點 `1438:682`（文案＋配圖 5 顆／只要文案 2 顆／只要配圖 3 顆），預設選取「文案＋配圖」。
- 設定區底部「預估消耗」依所選輸出類型動態顯示對應顆數。
- 結果區依輸出類型呈現對應內容（雙欄／純文案／純配圖）。
- `GeneratePostReq` 與 `api.generatePost`（mock）支援輸出類型參數，並讓扣款數與畫面顯示的顆數一致。

**Non-Goals:**

- 不處理真實後端串接（`docs/api-status.md` 若已有 `/generate/post` 真實端點的規劃不在此變更範圍內，僅更新 mock 與型別）。
- 不新增「只要文案」「只要配圖」各自獨立的「重做」流程（例如只重扣其中一項的入口 UI）；本次僅涵蓋生成前的類型選擇與生成後對應內容呈現，「之後只重做其中一項」是選項說明文字帶出的效益敘述，不代表本次要實作重做流程。
- 不調整 1:1／16:9／9:16 輸出比例邏輯，此區塊維持既有行為。

## Decisions

### 分段選擇器的狀態管理與預設值

新增 `outputType` 響應式狀態（型別為 `'both' | 'textOnly' | 'imageOnly'`），預設值 `'both'`，對應 Figma「文案＋配圖」的預設選取狀態。選項清單以陣列常數定義（label、feed 顆數、i18n key），比照現有 `ratios` computed 陣列的寫法，避免在 template 內重複硬寫三個選項。

### 飼料成本改為依輸出類型動態顯示

設定區底部「預估消耗」目前寫死 `t('units.feed', { count: 5 })`；改為依 `outputType` 從選項常數（5／2／3）取值。同一份成本常數同時供分段選擇器選項與底部預估消耗顯示使用，避免兩處數字不同步。

### GeneratePostReq 新增 outputType 欄位並對齊扣款

`GeneratePostReq`（`src/types/api.ts`）新增 `outputType: 'both' | 'textOnly' | 'imageOnly'` 欄位。`api.generatePost`（`src/api/mock.ts`）依此欄位：

- `'both'`：行為不變，回傳 `posterUrl` 與 `copy`／`hashtags`，`deduct(5)`。
- `'textOnly'`：只回傳 `copy`／`hashtags`（`posterUrl` 為 `undefined`），`deduct(2)`。
- `'imageOnly'`：只回傳 `posterUrl`（`copy` 為空字串、`hashtags` 為空陣列），`deduct(3)`。

原本固定 `deduct(12)` 與畫面顯示的 5 顆不一致，屬既有缺陷；本次一併修正為與畫面顯示同步，`src/api/mock.spec.ts` 既有的「generatePost 固定扣 12 顆」測試需同步更新為依輸出類型斷言（預設 `'both'` 時扣 5 顆）。

### 結果區依輸出類型呈現內容

`result` 為非空時，依 `result.value` 所屬的輸出類型決定渲染：

- `posterUrl` 存在則渲染貼圖欄（含「換一張圖」「下載」）。
- `copy` 非空字串則渲染文案欄（含「複製文案」「重寫文案」）。
- 兩者皆存在時維持現有左右兩欄版面；只有其中一項時該欄獨佔整個結果區寬度（不強制維持雙欄骨架、不顯示空的另一欄）。

判斷依據直接看 `GeneratedPost` 回傳內容（`posterUrl` 是否存在、`copy` 是否非空字串），不額外記錄「生成當下選的是哪個類型」的獨立狀態，避免使用者事後切換 `outputType` 卻讓已顯示的結果跟著改變。

## Implementation Contract

**行為（使用者可觀察）：**

- 設定區「1. 選擇商品圖片」上方新增「要產出什麼」區塊：標題文字＋三個可點選的分段選項（文案＋配圖 5 顆／只要文案 2 顆／只要配圖 3 顆），預設選取「文案＋配圖」；選項下方顯示提示文字「分開產出的好處：之後只重做其中一項，不必兩項都重扣。」。
- 點選任一分段選項後，該選項顯示為選取狀態，且設定區底部「預估消耗」的顆數立即改為該選項對應的顆數（5／2／3）。
- 點擊「產生貼文」時，依當下選取的輸出類型呼叫 `api.generatePost`；結果區依回傳內容渲染：`posterUrl` 有值才顯示貼圖欄，`copy` 非空字串才顯示文案欄；只有一欄時該欄獨佔寬度。

**介面／資料形狀：**

- `GeneratePostReq`（`src/types/api.ts`）新增必填欄位 `outputType: 'both' | 'textOnly' | 'imageOnly'`。
- `api.generatePost`（`src/api/mock.ts`）依 `outputType` 回傳對應的 `GeneratedPost`（欄位存在與否如上），並呼叫對應顆數的 `deduct()`。
- `MarketingPostView.vue` 新增 `outputType` ref 與對應的選項常數（含 label、i18n key、feed 顆數）。

**失敗模式：**

- 若 `outputType` 因程式錯誤而未帶入（理論上不會發生，因為有預設值 `'both'`），沿用既有 `errorMsg` 顯示 `t('errors.generationFailed')` 的錯誤路徑，不新增額外錯誤分支。
- 飼料不足時沿用既有 `isInsufficientFeed` 判斷與 `t('errors.insufficientFeed')` 顯示，不因輸出類型而異。

**驗收標準：**

- `npm run build`（`vue-tsc --noEmit` + vite build）通過。
- `npm test` 通過，且 `src/api/mock.spec.ts` 的 `generatePost` 相關測試依新的 `outputType`／扣款數更新後仍綠燈。
- 手動／測試檢查：切換三個分段選項時，「預估消耗」顆數與選項上顯示的顆數一致；選擇「只要文案」生成後結果區只出現文案欄，選擇「只要配圖」生成後結果區只出現貼圖欄，選擇「文案＋配圖」（預設）維持現有雙欄。

**範圍邊界：**

- 範圍內：新增分段選擇器 UI、飼料顆數動態顯示、`GeneratePostReq`／mock 回傳與扣款依輸出類型分流、結果區依回傳內容單欄／雙欄呈現、對應 i18n 字串。
- 範圍外：真實後端 API 串接、「只重做其中一項」的獨立重做入口、輸出比例（1:1／16:9／9:16）邏輯調整、品牌設定開關邏輯調整。

## Risks / Trade-offs

- [風險] 修正 `deduct(12)` 為依輸出類型 5／2／3 顆，屬於行為變更（扣款數變少），若有既有使用者流程或測試依賴「固定扣 12 顆」的假設會受影響 → 緩解：同步更新 `src/api/mock.spec.ts` 對應測試案例，並在 commit body 註明此為修正既有顯示與扣款不一致的缺陷，非新引入的行為。
- [風險] 結果區改成依回傳內容決定單欄／雙欄，若後端／mock 回傳格式有誤（例如 `'both'` 卻少回 `posterUrl`）會被誤判為「只要文案」的結果 → 緩解：mock 端依 `outputType` 明確分流回傳內容，並在 apply 階段的驗收檢查中涵蓋三種輸出類型各自生成一次的情境。
