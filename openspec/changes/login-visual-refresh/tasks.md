## 1. 資產準備

- [x] 1.1 從 Pencil 設計檔（`login-redesign-restored.pen`，frame `iMfgU`）匯出官方 MantaGO logo，存成 `src/assets/images/mantago-logo.svg`。驗證：檔案存在，且可在瀏覽器直接開啟並正確顯示 MantaGO 圖示與字標。
- [x] 1.2 從同一份 Pencil 設計檔匯出登入頁背景圖，存成 `src/assets/images/login-bg.png`，並控制檔案大小在 500KB 以下。驗證：檔案存在且 `ls -la` 顯示檔案大小小於 500KB。

## 2. 容器版型調整

- [x] 2.1 對齊設計決策「全螢幕背景 + 懸浮卡片版型取代置中卡片」：修改 `LoginView.vue` 的 `.loginView` SCSS，背景改為引用 `login-bg.png` 並設定 `background-size: cover`，卡片（`.loginView__panel`）維持不透明白色背景、既有圓角與陰影不變，改為在視窗正中央懸浮顯示。驗證：`npm run dev` 後於瀏覽器開啟 `/login`，桌面寬度（≥ 1024px）下背景圖鋪滿整個視窗，登入卡片以不透明白色懸浮置中顯示。

## 3. 品牌區塊置換

- [x] 3.1 對齊 Requirement「登入頁品牌區塊顯示官方 MantaGO logo」與設計決策「品牌區塊改用官方 MantaGO logo 圖片」：移除 `.loginView__avatar` 圓形色塊元素與 `.loginView__brandText`（`strong`/`small` 文字堆疊），改為單一 `img` 標籤引用 `src/assets/images/mantago-logo.svg`，寬度依原始比例（約 130:36）縮放，維持在卡片標題上方的既有位置。驗證：瀏覽器開啟 `/login`，卡片內標題「登入」上方顯示 MantaGO 官方 logo 圖片，畫面不再出現圓形色塊或「MantaGO / Manta Vision」文字堆疊。

## 4. 響應式行為

- [x] 4.1 對齊 Requirement「登入頁採用全螢幕背景與懸浮卡片版型」與設計決策「窄螢幕斷點行為：卡片維持置中」：在 `$bp-sm`（560px）以下，調整 `.loginView__panel` 寬度改為視窗寬度扣除左右間距（沿用既有 `padding: 1.5rem` 邏輯），卡片持續置中顯示。驗證：瀏覽器將視窗寬度縮小至 375px，登入表單卡片置中顯示、不溢出視窗邊界、頁面不出現橫向捲動軸。

## 5. 過渡資產標記

- [x] 5.1 對齊設計決策「背景美術資產以 AI 生成圖片作為過渡方案」：commit message 的 body 中註明 `login-bg.png` 為 AI 生成示意圖、非最終定稿，待設計端提供正式圖檔後另立 change 替換。驗證：檢查該次 commit 的 message body 包含此說明文字。

## 6. 驗證

- [x] 6.1 執行 `npm run build`（`vue-tsc --noEmit` 型別檢查 + vite build）。驗證：指令執行完成且結束代碼為 0，終端機輸出無型別錯誤。
- [x] 6.2 執行 `npm run lint`。驗證：指令執行完成且結束代碼為 0，終端機輸出無 ESLint 錯誤。
- [x] 6.3 手動驗證 login-gate 既有登入行為不受本次視覺改版影響：於登入頁輸入帳號 `mavis`、密碼 `mavis123` 送出，應成功登入並離開登入頁；再次訪問登入頁輸入錯誤密碼送出，應顯示錯誤訊息且停留在登入頁。驗證：手動操作瀏覽器確認兩種情境的結果皆符合預期，且畫面版面（背景圖、懸浮卡片、logo）在兩種狀態下都正常顯示不跑版。
