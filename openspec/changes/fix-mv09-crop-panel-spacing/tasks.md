## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `605:4997`（panel_crop）與 `606:870`（row_ratio）、`606:885`（divider）、`606:889`（cell_IG 貼文）的精確節點資料，確認使用者反映的按鈕間距落差、分隔線缺漏、標題字色落差屬實
- [x] 1.2 `.cropPanel .ratioRow` 的 `min-height` 改為貼合單行內容高度，`.custom` 補上 `margin-top`，讓比例列與「自訂」間距對齊 8px（commit TBD）
- [x] 1.3 補上「各通路預覽」標題上方分隔線（`.channelPreviewsTitle`）與卡片標題字色（`.preview strong`）
- [x] 1.4 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上 Scenario 與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-crop-panel-spacing`
