## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `1157:619`（文字屬性面板）的精確節點資料，確認內距與分隔線落差屬實
- [x] 1.2 `.properties` 補上 `padding` 與 `border-top`（commit TBD）
- [x] 1.3 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「字型選單的九個字體家族與 Figma list_font 逐項一致」Requirement 補上面板內距／分隔線描述與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-properties-panel-spacing`
