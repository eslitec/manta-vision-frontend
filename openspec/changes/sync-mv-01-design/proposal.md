## Why

MantaGO 的 Figma 設計稿在 MV-01（圖庫管理中心，`LibraryView.vue`）實作完之後又更新過了，跟 MV-00 遇到的情況一樣。這個 change 接續 `sync-mv-00-design` 完成後的下一頁，把圖庫管理中心跟最新設計稿對齊：目前這個頁面的圖示還是用 `@tabler/icons-webfont`（`i.ti.ti-*`）的過渡方案，尚未換成設計稿提供的精確 SVG 素材；其餘文案、間距、字級、色碼等細節，會由使用者透過 Figma Inspect 逐一提供數值後比對修正（Figma MCP 額度持續受限，沿用 MV-00 確立的人工比對流程）。

## What Changes

- 逐一核對 `LibraryView.vue` 的文案、間距、字級、行高、色碼，對齊設計稿的精確數值（比對過程持續進行，逐項記錄在 `tasks.md`）。
- 把頁面上仍使用 `i.ti.ti-*` 圖示字型的地方（搜尋、從圖庫加入、上傳、素材縮圖類型），視情況換成設計稿提供的精確 SVG 素材（若設計稿本身就是用簡單線稿圖示、跟圖示字型視覺一致，則保留不換，避免不必要的改動）。
- **範圍擴大（使用者提供完整畫面截圖後發現）**：這一頁跟目前實作的差異不只是視覺細節，還包含以下原本沒有的功能，已跟使用者確認一起做：
  - 左側篩選重構為「全部素材」／「系統分類」（依素材類型，帶數量）／「我的資料夾」（帶數量）三段式結構。
  - 素材批次選取（checkbox＋批次操作列），支援批次「移至資料夾」（含就地建立新資料夾）、「移出資料夾」、「刪除」（帶確認彈窗）、「下載」（先做畫面呈現，無實際檔案可下載）。
  - 素材清單分頁（8 筆一頁）。
- **暫緩、留給後續 change 處理**：設計稿上另外還有一組「非同步生成進度」的畫面（圖庫格線內顯示生成中項目的進度條、頂部工具列「任務」按鈕的數字徽章），這組功能會同時涉及 `LibraryView.vue` 與共用外殼 `DefaultLayout.vue`（跨到 `home-workbench-ui` capability），先不在這個 change 處理，待批次選取相關功能完成並驗證後再決定怎麼安排。
- 具體視覺細節（文案、間距、字級、色碼）待使用者提供 Figma Inspect 數值後逐一確認，不在此預先假設。

## Capabilities

### New Capabilities
- `library-management-ui`：圖庫管理中心頁面（MV-01）——使用者檢視、篩選、搜尋、上傳素材，管理資料夾，並對選取的素材執行批次操作（移動、移出、刪除）的畫面呈現。

### Modified Capabilities
（無）

備註：本 change 不改動共用外殼那個 capability（home-workbench-ui，屬於 MV-00）。非同步生成進度功能會需要調整 DefaultLayout.vue，但那部分已明確排除在這個 change 之外，見上方 What Changes。此處刻意不加反引號，避免 spectra analyze 把它判讀成本 change 宣告了該 capability 卻缺少對應的 spec 檔。

## Impact

- `src/views/LibraryView.vue`
- `src/types/asset.ts`（新增 `CATEGORY_TAGS` 常數）
- `src/composables/useAssets.ts`（新增 `removeFromFolder`、`deleteAssets`）
- `src/api/mock.ts`（新增 `removeFromFolder`、`deleteImages` 兩個 mock 端點）
- `src/assets/scss/main.scss`（補上 `button::-moz-focus-inner` 正規化，修正 Firefox 點擊按鈕時文字位移的問題，全站生效、不只限這一頁）
- 不涉及路由變動；新增的兩個 mock API 端點目前沒有對應的真實後端，後端就緒後只需替換 `src/api/index.ts` 指向的實作。
