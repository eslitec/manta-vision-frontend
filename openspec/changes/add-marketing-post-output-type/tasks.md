## 1. 型別與 mock API

- [x] 1.1 對齊 Requirement「選擇輸出內容類型」與設計決策「GeneratePostReq 新增 outputType 欄位並對齊扣款」：在 `src/types/api.ts` 的 `GeneratePostReq` 新增 `outputType: 'both' | 'textOnly' | 'imageOnly'` 必填欄位；驗證：`npm run build` 型別檢查通過。
- [x] 1.2 依設計決策「GeneratePostReq 新增 outputType 欄位並對齊扣款」：修改 `src/api/mock.ts` 的 `generatePost` 依 `outputType` 分流回傳內容——`'both'` 回傳 `posterUrl`＋`copy`＋`hashtags` 並 `deduct(5)`；`'textOnly'` 只回傳 `copy`＋`hashtags`（`posterUrl` 為 `undefined`）並 `deduct(2)`；`'imageOnly'` 只回傳 `posterUrl`（`copy` 為空字串、`hashtags` 為空陣列）並 `deduct(3)`；驗證：在 `src/api/mock.spec.ts` 新增針對三種 `outputType` 呼叫後回傳內容與扣款數的斷言，`npm test` 通過。
- [x] 1.3 更新 `src/api/mock.spec.ts` 既有「generatePost 固定扣 12 顆」測試，改為依 `outputType` 預設 `'both'` 斷言扣 5 顆飼料（取代原本寫死的 12 顆，修正畫面顯示與實際扣款不一致的既有缺陷）；驗證：`npm test` 該測試案例綠燈。

## 2. 要產出什麼分段選擇器 UI

- [x] 2.1 對齊 Requirement「選擇輸出內容類型」與設計決策「分段選擇器的狀態管理與預設值」：在 `MarketingPostView.vue` 新增 `outputType` ref（預設 `'both'`）與輸出類型選項常數（含 label、i18n key、飼料顆數），並在「1. 選擇商品圖片」之前渲染「要產出什麼」標題、三個分段選項（文字與飼料顆數逐字對齊 Figma 節點 `1438:682`：「文案＋配圖」5 顆／「只要文案」2 顆／「只要配圖」3 顆）與提示文字「分開產出的好處：之後只重做其中一項，不必兩項都重扣。」（節點 `1438:725`）；驗證：`npm run dev` 手動檢視三個選項與提示文字對齊 Figma 截圖，點擊任一選項該選項顯示為選取狀態（原選取選項取消選取）。
- [x] 2.2 對齊 Requirement「生成貼文標示飼料消耗」與設計決策「飼料成本改為依輸出類型動態顯示」：設定區底部「預估消耗」的飼料顆數改為依 `outputType` 從共用的選項成本常數取值（5／2／3），移除目前寫死的 `t('units.feed', { count: 5 })`；驗證：手動切換三個分段選項時，「預估消耗」文字同步顯示為「預估消耗 5／2／3 顆飼料」。

## 3. 生成呼叫與結果區呈現

- [x] 3.1 修改 `generate()` 呼叫 `api.generatePost` 時帶入當下 `outputType.value`（作為新必填欄位）；驗證：`npm run build` 型別檢查通過（`GeneratePostReq.outputType` 不可省略）。
- [x] 3.2 對齊 Requirement「結果區呈現圖與文案兩欄」與設計決策「結果區依輸出類型呈現內容」：結果區改為依 `result.value.posterUrl` 是否存在渲染貼圖欄、`result.value.copy` 是否為非空字串渲染文案欄，兩者皆存在時維持現有左右兩欄版面，只有其中一項時該欄獨佔整個結果區寬度、不顯示空的另一欄；驗證：分別以「只要文案」「只要配圖」「文案＋配圖」三種選項各生成一次並手動檢視結果區呈現的欄位組合符合預期。

## 4. 多語系與最終驗收

- [x] 4.1 在 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts` 新增「要產出什麼」區塊所需字串（區塊標題、三個選項 label、提示文字），兩邊 key 結構一致；驗證：`npx prettier --check src/lang/zh-Hant.ts src/lang/en.ts` 通過，且兩檔案新增的 key 集合相同（無單邊漏補）。
- [x] 4.2 執行完整驗收：`npm run build`、`npm test`、`npm run lint` 全數通過，作為本次變更完成的最終驗證。
