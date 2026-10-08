## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `1144:618`（panel_crop，裁切套用後）精確節點資料，確認尺寸文字／標題／副標文案與顏色跟目前實作不同
- [x] 1.2 尺寸文字、通路預覽標題、通路預覽副標文字與顏色依編輯中／已套用兩種狀態切換
- [x] 1.3 `.cropPanel > p` 補上 12px／4px 上下內距，`.custom` 移除重複的下邊距
- [x] 1.4 `.preview small.full` 補上綠色 `#54c14f`
- [x] 1.5 `zh-Hant.ts`／`en.ts` 補上 `croppedToDynamic`、`paddedNote`；`en.ts` 補上遺漏的 `channelPreviewsApplied`
- [x] 1.6 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上 Scenario 與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-crop-applied-panel-text`
