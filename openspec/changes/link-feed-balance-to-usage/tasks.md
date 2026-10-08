## 1. 頂部工具列（FeedBadge.vue）

- [x] 1.1 落地設計決策「決策 2：用 `vue-router` 的 `useRouter().push('/usage')`，不用 `<router-link>` 包裹圖示」：`src/components/FeedBadge.vue` 引入 `useRouter`，新增 `goToUsage` 函式呼叫 `router.push('/usage')`
- [x] 1.2 對齊 Requirement「頂部工具列顯示目前情境與使用者身分」新增內容：`IconFeedBottleSmall` 外面包一個 `button(type="button" @click="goToUsage" :aria-label="t('feedBadge.topup')")`，補上 `cursor: pointer` 樣式；「儲值」的 `AppButton` 加上 `@click="goToUsage"`
- [x] 1.3 落地設計決策「決策 3：飼料圖示與儲值按鈕各自獨立可點擊，不合併成單一大按鈕」：確認飼料餘額數字本身（`.feedBadge__amount` 或同等 class）沒有被連帶包進可點擊容器，維持純展示

## 2. 首頁工作台（HomeView.vue）

- [x] 2.1 對齊 Requirement「狀態列顯示帳號與品牌狀態」新增內容：`src/views/HomeView.vue` 引入 `useRouter`（若尚未引入），新增 `goToUsage` 函式呼叫 `router.push('/usage')`
- [x] 2.2 對齊 Requirement「狀態列顯示帳號與品牌狀態」新增內容：`.stats__numIcon`（`IconFeedBottleSmall`）外面包一個 `button(type="button" @click="goToUsage" :aria-label="t('home.topup')")`，補上 `cursor: pointer` 樣式；「＋ 儲值飼料」的 `AppButton` 加上 `@click="goToUsage"`
- [x] 2.3 落地設計決策「決策 3：飼料圖示與儲值按鈕各自獨立可點擊，不合併成單一大按鈕」：確認飼料餘額數字本身沒有被連帶包進可點擊容器，維持純展示

## 3. 範圍確認與驗證

- [x] 3.1 落地設計決策「決策 1：飼料圖示與儲值按鈕都做成可點擊、導向同一個目的地，不是只修其中一個」：確認 `FeedBadge.vue` 與 `HomeView.vue` 兩處的圖示與按鈕總共四個可點擊元素都指向 `/usage`
- [x] 3.2 確認 Non-Goals 範圍邊界：`GenerateImageView.vue`、`GenerateVideoView.vue`、`ImageEditorWorkspace.vue`、`ConfirmGenerateDialog.vue`、`UsageView.vue` 這五個顯示「預估花費 N 顆飼料」的檔案沒有被連帶修改，`IconFeedBottleSmall.vue` 本身的 SVG 內容也沒有改動
- [x] 3.3 `npm run lint` 通過
- [x] 3.4 `npx vue-tsc --noEmit` 通過
- [x] 3.5 瀏覽器手動驗證（Playwright，真後端帳號 qa_brand_test）：對齊 Requirement「頂部工具列顯示目前情境與使用者身分」與「狀態列顯示帳號與品牌狀態」——分別點擊頂部工具列的飼料圖示、頂部「儲值」按鈕、首頁飼料圖示、首頁「＋ 儲值飼料」按鈕，確認四者點擊後瀏覽器網址列皆變成 `/usage`
- [x] 3.6 執行 `spectra validate link-feed-balance-to-usage --strict` 與 `spectra analyze link-feed-balance-to-usage`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 3.7 PR 合併並確認畫面驗收無誤後執行 `spectra archive link-feed-balance-to-usage`
