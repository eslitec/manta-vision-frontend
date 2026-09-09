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
- [ ] 3.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive add-library-loading-skeleton`
