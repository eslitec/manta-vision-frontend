## 1. 修正間距

- [x] 1.1 對齊 Requirement「使用者可批次選取素材並執行批次操作」新增內容：`src/views/LibraryView.vue` 的 `.batchbar__actions` 把 `@include flex(flex-start, center, 1.25rem)` 的 gap 參數改成 `0.5rem`

## 2. 驗證

- [x] 2.1 `npx vue-tsc --noEmit` 通過
- [x] 2.2 `npm run lint` 通過
- [x] 2.3 對齊 Requirement「批次操作列的動作按鈕間距對齊設計稿」——瀏覽器手動驗證（`agent-browser`）：勾選一筆素材開啟批次操作列，`getComputedStyle(document.querySelector('.batchbar__actions')).gap` 回傳 `"8px"`（等於 0.5rem），其餘版面不變
- [x] 2.4 執行 `spectra validate fix-library-batchbar-actions-gap --strict` 與 `spectra analyze fix-library-batchbar-actions-gap`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 2.5 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-library-batchbar-actions-gap`
