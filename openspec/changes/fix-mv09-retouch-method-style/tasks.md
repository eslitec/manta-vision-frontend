## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `608:5370`（row_mode）的精確節點資料，確認選中狀態的底色／框線／標題文字落差屬實
- [x] 1.2 `.method.active` 補上底色、加粗框線，標題文字補上選中變色（commit TBD）
- [x] 1.3 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「AI 修圖提供分項修飾與對比」Requirement 補上選中樣式描述與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-retouch-method-style`
