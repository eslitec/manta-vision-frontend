## 1. 修正

- [x] 1.1 對齊 Requirement「素材可依來源與關鍵字篩選」（commit `ac5e14e`）：`LibraryView.vue` 的 `.chip` 移除多餘的 `line-height: 1`
- [x] 1.2 `npx vue-tsc --noEmit` 確認無錯誤

## 2. 驗證

- [x] 2.1 瀏覽器手動驗證：開啟 `/library`，確認來源篩選 chip 文字垂直度量跟其他 chip／pill 元件一致
- [x] 2.2 執行 `spectra validate fix-library-filter-chip-line-height --strict` 與 `spectra analyze fix-library-filter-chip-line-height`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-library-filter-chip-line-height`
