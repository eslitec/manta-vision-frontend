## 1. 骨架卡片實作

- [x] 1.1 對齊 Requirement「素材清單載入中顯示骨架屏卡片，工具列與頁碼列同步降透明度」：`LibraryView.vue` 把 `.assets__empty(v-if="loading && !pagedRealAssets.length && !pendingTasks.length && !showMaterials")` 這個分支改成骨架卡片版本——`v-for="n in 8"` 渲染骨架卡片，包在既有的 `.assets__grid` 容器裡（沿用其 `grid-template-columns`），不再顯示 `t('common.loading')` 純文字；新增 `showLoadingSkeleton` computed 統一表達這個條件，供工具列／頁碼列共用
- [x] 1.2 落地設計決策「決策 1：骨架卡片直接寫在 LibraryView.vue，不抽成獨立元件」：骨架卡片的 template（縮圖／標題／標籤＋尺寸三個佔位區塊）與對應 CSS 都寫在 `LibraryView.vue` 內，不新增元件檔案
- [x] 1.3 落地設計決策「決策 2：骨架卡片張數固定 8 張，等於 `PAGE_SIZE`」：骨架卡片數量寫死 8（`v-for="n in 8"`），不依容器寬度動態計算
- [x] 1.4 骨架卡片版面對齊 Figma node `1309:7676`：卡片 252×215、白底、`1px #d2d5dd` 邊框、`10px` 圓角、`4px` 內距、垂直 `8px` 間距；縮圖佔位 244×152（`8px` 圓角）、標題佔位 139×13（`6px` 圓角）、標籤佔位 58×18（`10px` 圓角膠囊）＋尺寸佔位 64×11（`6px` 圓角），漸層色 `#e4e8f2` → `#f2f5fb`（50%）→ `#e4e8f2`
- [x] 1.5 落地設計決策「決策 3：漸層色塊加上由左至右的 shimmer 掃光動畫」：色塊 `background-size: 200% 100%`，新增 `@keyframes` 讓 `background-position` 從 `200% 0` 掃到 `-200% 0`，`1.5s ease-in-out infinite`

## 2. 工具列與頁碼列降透明度

- [x] 2.1 對齊 Requirement「素材清單載入中顯示骨架屏卡片，工具列與頁碼列同步降透明度」：`.assets__toolbar` 在骨架屏狀態下套用 `opacity: 0.5` 與 `pointer-events: none`
- [x] 2.2 落地設計決策「決策 4：頁碼列在載入中維持顯示（降透明度），不是完全隱藏；不虛構頁碼數字」：`.pagination` 的顯示條件從 `v-if="displayTotal"` 改成 `v-if="displayTotal || showLoadingSkeleton"`（骨架屏狀態下即使 `displayTotal` 是 0 也要顯示）；骨架屏狀態下套用 `opacity: 0.4` 與 `pointer-events: none`，左側 `.pagination__total` 文字改顯示 `t('common.loading')`；右側頁碼按鈕沿用既有 `pageItems`／`page` 計算結果，不額外塞入固定的示意數字
- [x] 2.3 `npx vue-tsc --noEmit` 確認無錯誤

## 3. 驗證

- [x] 3.1 瀏覽器手動驗證（Playwright，真後端帳號 qa_brand_test）：切換左側篩選觸發重新查詢時，poll DOM 精確捕捉到骨架屏狀態——8 張 `.assetSkeleton` 卡片，`getComputedStyle` 逐項核對與 Figma 完全一致：卡片 252×215px／`1px solid rgb(210,213,221)`(`#d2d5dd`)／`10px` 圓角／白底／`8px` gap／`4px` padding；縮圖佔位 244×152px／`8px` 圓角；標題佔位 139×13px／`6px` 圓角；標籤佔位 58×18px／`10px` 圓角；尺寸佔位 64×11px／`6px` 圓角；四個佔位色塊的 `backgroundImage` 皆為 `linear-gradient(to right, rgb(228,232,242) 0%, rgb(242,245,251) 50%, rgb(228,232,242) 100%)`、`background-size: 200% 100%`，且 `animationName` 確認 `assetSkeletonShimmer` 正在套用（`animationDuration: 1.5s`）
- [x] 3.2 瀏覽器手動驗證：同一次 poll 也確認工具列（`.assets__toolbar`）`opacity: 0.5`／`pointer-events: none`，頁碼列（`.pagination`）`opacity: 0.4`、左側文字為「載入中…」；資料回來後（切回「全部素材」）三者皆恢復正常。篩選在已有既有素材時觸發重新查詢（例如從「AI 生成」切到「編輯產物」），頁碼列全程維持顯示、只切換透明度與文字，未被完全隱藏
- [x] 3.3 `npm run lint` 通過
- [x] 3.4 `npx vue-tsc --noEmit` 通過
- [x] 3.5 執行 `spectra validate add-library-loading-skeleton --strict` 與 `spectra analyze add-library-loading-skeleton`，確認沒有 CRITICAL／WARNING 級別的發現

## 4. 骨架屏最短顯示時間（修正動畫不可感知問題）

- [x] 4.1 落地設計決策「決策 5：骨架屏套用最短顯示時間（500ms），避免真實環境下一閃即逝看不到 shimmer 動畫」：`LibraryView.vue` 新增最短顯示時間計時邏輯——`showLoadingSkeleton` 從 true 變 true 那一刻記錄時間戳，查詢完成（`loading` 變 false）時若未滿 500ms 則延後切換，滿 500ms 或原本就超過 500ms 則立即切換
- [x] 4.2 對齊 Requirement 新增內容「骨架屏 SHALL 至少維持顯示 500 毫秒，即使查詢在 500 毫秒內就已完成，也 SHALL NOT 提前切換成實際內容；查詢耗時超過 500 毫秒時，SHALL 在查詢完成當下立即切換，SHALL NOT 額外延遲」：確認兩種情境（查詢 <500ms／查詢 >500ms）都符合上述行為
- [x] 4.3 瀏覽器手動驗證（Playwright，真後端帳號 qa_brand_test）：切換到「AI 生成」分類觸發重新查詢，實測 `firstSeen: 16.7ms`、`lastSeen: 508ms`、`durationVisible: 491.3ms`——骨架屏確實延後到接近滿 500ms 才消失，而不是原本本機真後端 ~36ms 就一閃而過，shimmer 掃光位移在這段時間內可被實際觀察到
- [x] 4.4 `npm run lint` 與 `npx vue-tsc --noEmit` 通過
- [x] 4.5 執行 `spectra validate add-library-loading-skeleton --strict` 與 `spectra analyze add-library-loading-skeleton`，確認沒有 CRITICAL／WARNING 級別的發現

## 5. 骨架屏正確重新觸發（修正單頁伺服器分頁檢視翻頁／切換分類完全不出現的問題）

- [x] 5.1 落地設計決策「決策 6：非合流檢視（單頁伺服器分頁）翻頁／切換篩選時清空 `assets.value`；合流檢視刻意不清空」：`LibraryView.vue` 的 `fetchAssets()` 只在非合流分支（`await load(buildQuery())` 之前）同步執行 `assets.value = []`；合流分支（`mergesMaterials.value` 為真）維持原樣不清空；不修改 `useAssets.ts`
- [x] 5.2 對齊 Requirement 新增內容「單頁伺服器分頁的檢視（資料夾、`aiGenerate`／`edit`／`video` 分類）切換頁碼或篩選分類觸發新查詢時，即使切換前的頁面已經顯示素材，骨架屏 SHALL 仍正確觸發，SHALL NOT 因為沿用切換前那一頁已顯示的舊資料而完全不出現骨架屏」與「整批預先撈取、前端自行切頁的合流檢視（全部素材、物件素材、未分類）在資料已經完整存在本地快取時，SHALL NOT 為了視覺一致性而人為插入骨架屏」
- [x] 5.3 瀏覽器手動驗證（Playwright，真後端帳號 qa_brand_test）：用 debug log 逐項確認過「全部素材」（合流檢視）內建素材共 32 筆、`PAGE_SIZE = 8`，翻到第 2～4 頁時 `showMaterials` 為真、`wouldShowEmptySkeleton` 為假；移除 debug log 後重新實測，連續切換第 2、3、4、1 頁，`sawSkeleton` 皆為 `false`、每頁 `materialCount` 皆為 8，確認合流檢視維持即時切換、沒有為此修正引入新的閃爍。非合流路徑：切換到「AI 生成」分類（0 筆，這個測試帳號目前所有非合流分類皆為 0 筆、未建立資料夾，沒有多頁真實資料可驗證翻頁情境），實測骨架屏正確觸發且套用決策 5 的最短顯示時間（見 4.3 的 `firstSeen`／`lastSeen`），確認 `assets.value = []` 清空與 `wouldShowEmptySkeleton` 判斷正確銜接；`pagedRealAssets` 在非合流分支直接回傳 `assets.value` 已經過程式碼檢視確認
- [x] 5.4 `npm run lint` 與 `npx vue-tsc --noEmit` 通過
- [x] 5.5 執行 `spectra validate add-library-loading-skeleton --strict` 與 `spectra analyze add-library-loading-skeleton`，確認沒有 CRITICAL／WARNING 級別的發現

## 6. 收尾

- [ ] 6.1 PR 合併並確認畫面驗收無誤後執行 `spectra archive add-library-loading-skeleton`
