## 1. 建立共用元件

- [x] 1.1 新增 `DialogButton.vue`（`variant: 'plain' | 'primary' | 'danger'`），取代彈窗裡的 `.btn-plain`／`.btn-primary`（pill 版）／`.btn-danger`
- [x] 1.2 新增 `PrimaryButton.vue`，取代頁面主要動作的 `.btn-primary`（CTA 版，10px 圓角＋陰影）
- [x] 1.3 新增 `GhostButton.vue`，取代 `.btn-outline`
- [x] 1.4 新增 `ChipButton.vue`（`variant: 'dark' | 'plain'`），取代 `.chip-dark`／`.chip-plain`

## 2. 套用到彈窗按鈕（DialogButton）

- [x] 2.1 `ImagePickerDialog.vue`：取消／確認按鈕
- [x] 2.2 `ConfirmGenerateDialog.vue`：取消／確認生成按鈕（含圖示）
- [x] 2.3 `LibraryView.vue`：「移至資料夾」彈窗的取消／確認、刪除確認彈窗的取消／永久刪除，以及工具列「從圖庫加入」按鈕（原本就跟彈窗按鈕共用同一個 `.btn-primary` 定義）
- [x] 2.4 `TryOnView.vue`：肖像同意彈窗的「取消」按鈕（「我同意」維持用 `PrimaryButton`，見 design.md 決策）

## 3. 套用到頁面主要動作（PrimaryButton）

- [x] 3.1 `GenerateImageView.vue`：「生成圖片」
- [x] 3.2 `GenerateVideoView.vue`：「生成影片」
- [x] 3.3 `MarketingPostView.vue`：「生成貼文」
- [x] 3.4 `TryOnView.vue`：「生成試穿」、肖像同意彈窗「我同意」
- [x] 3.5 `BrandSettingsView.vue`：「儲存設定」（padding 從 `11px 24px` 統一為共用元件的 `11px 20px`）

## 4. 套用到次要動作（GhostButton）與結果動作列（ChipButton）

- [x] 4.1 `GenerateImageView.vue`／`GenerateVideoView.vue`／`MarketingPostView.vue`／`TryOnView.vue`：「從圖庫選擇」改用 `GhostButton`
- [x] 4.2 `UsageView.vue`：「調整額度上限」改用 `GhostButton`（padding 從 `9px 18px` 統一為共用元件的 `8px 16px`）
- [x] 4.3 `GenerateImageView.vue`／`MarketingPostView.vue`：生成結果動作列（存入圖庫／下載／重生成／複製文案／重寫文案）改用 `ChipButton`

## 5. 清理與驗證

- [x] 5.1 移除 8 個檔案裡重複定義的 `.btn-plain`／`.btn-primary`／`.btn-danger`／`.btn-outline`／`.chip-dark`／`.chip-plain` CSS 規則，以及 `LibraryView.vue` 裡已經沒有樣板在用的孤兒規則 `.fromlib`
- [x] 5.2 全文搜尋確認沒有殘留的 `button.btn-*`／`button.chip-*` 樣板寫法或對應的 CSS 定義
- [x] 5.3 `npm run build`（含 `vue-tsc` 型別檢查）確認通過
- [x] 5.4 啟動本機開發伺服器，逐一開啟 8 個受影響頁面／彈窗，用瀏覽器檢查沒有 console 錯誤，並用 `getComputedStyle` 確認每個共用元件的顏色／圓角／陰影／停用狀態跟預期一致（含 `GenerateImageView`／`TryOnView`／`BrandSettingsView`／`LibraryView` 兩個彈窗／`GenerateVideoView` 的 `ConfirmGenerateDialog`／`MarketingPostView`／`UsageView`）
