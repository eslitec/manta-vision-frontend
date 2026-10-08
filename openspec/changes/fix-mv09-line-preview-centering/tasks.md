## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `606:922`（cell_LINE 圖文）的精確節點資料，確認 review 反映的落差屬實
- [x] 1.2 `.preview__thumb.wide` 改成上下對稱的 margin，讓縮圖在格子裡置中（commit TBD）
- [x] 1.3 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上 Scenario 與 trace
- [ ] 2.2 回覆 PR review：說明修法並請 reviewer 複查
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-line-preview-centering`
