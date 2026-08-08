## Why

有 3 組按鈕樣式（`.btn-plain`／`.btn-primary`／`.btn-danger`、`.btn-outline`、`.chip-dark`／`.chip-plain`）各自在 8 個檔案裡用幾乎一模一樣的 CSS 複製貼上出來，只有 padding 之類的小數值有些微差異（明顯是每次新增畫面時複製前一個檔案留下的漂移）。改一個共用視覺規則（例如陰影、圓角）現在要記得同步改 8 個地方，容易漏改；也讓人搞不清楚同一個類別名稱在不同檔案裡是不是真的長得一樣。這個 change 把這些重複的樣式收斂成共用元件。

## What Changes

- 盤點結果：`.btn-plain`／`.btn-primary`（pill 版）／`.btn-danger` 出現在 4 個檔案（`ImagePickerDialog.vue`、`ConfirmGenerateDialog.vue`、`LibraryView.vue`、`TryOnView.vue`），都是彈窗裡的取消／確認／刪除按鈕；`.btn-primary`（CTA 版，10px 圓角＋陰影）出現在 5 個檔案（`GenerateImageView.vue`、`GenerateVideoView.vue`、`MarketingPostView.vue`、`TryOnView.vue`、`BrandSettingsView.vue`），都是頁面主要動作按鈕；`.btn-outline` 出現在 5 個檔案（同上 4 個 CTA 檔案＋`UsageView.vue`），是「從圖庫選擇」之類的次要動作；`.chip-dark`／`.chip-plain` 出現在 2 個檔案（`GenerateImageView.vue`、`MarketingPostView.vue`），是生成結果下方的小動作按鈕。
- 新增 4 個共用元件取代這些重複的 CSS 類別：
  - `DialogButton.vue`（`variant: 'plain' | 'primary' | 'danger'`）：取代彈窗裡的 `.btn-plain`／`.btn-primary`（pill 版）／`.btn-danger`。
  - `PrimaryButton.vue`：取代頁面主要動作的 `.btn-primary`（CTA 版）。
  - `GhostButton.vue`：取代 `.btn-outline`。
  - `ChipButton.vue`（`variant: 'dark' | 'plain'`）：取代 `.chip-dark`／`.chip-plain`。
- 8 個受影響的畫面／元件改用上述共用元件，並移除各自檔案裡重複定義的 CSS 類別。
- 過程中發現的微小數值差異（例如 padding 8px vs 9px、20px vs 24px）統一為其中一個常見值，視覺上幾乎無法察覺，純粹是消除複製貼上留下的漂移，不是刻意的設計調整。

## Capabilities

（無——`skip_specs: true`，這是純技術重構：畫面上呈現的按鈕文字、可點擊行為、啟用／停用狀態完全不變，只是把重複的 CSS 定義收斂成共用元件，不涉及可觀察行為的變化）

## Impact

- 新增：`src/components/DialogButton.vue`、`src/components/PrimaryButton.vue`、`src/components/GhostButton.vue`、`src/components/ChipButton.vue`
- 修改：`src/components/ImagePickerDialog.vue`、`src/components/ConfirmGenerateDialog.vue`、`src/views/LibraryView.vue`、`src/views/TryOnView.vue`、`src/views/GenerateImageView.vue`、`src/views/GenerateVideoView.vue`、`src/views/MarketingPostView.vue`、`src/views/BrandSettingsView.vue`、`src/views/UsageView.vue`
- 不涉及路由、store 或 API 變動。
