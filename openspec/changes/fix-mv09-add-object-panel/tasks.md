## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `1141:906`（整頁）、`1141:941`（panel_layers）、`1141:952`（props_object）、`1141:934`（canvas_art／選取框）精確節點資料
- [x] 1.2 字數上限 120→200（textarea maxlength 與顯示文字）
- [x] 1.3 修正 `descriptionPlaceholder`、`hint` 文案（zh-Hant.ts），補上 en.ts 缺漏的 `addObject`／`cropApplied`
- [x] 1.4 `.objectGenerator` 間距 8px→10px；`.presetChip` 圓角／文字色／字級對齊設計稿；`.objectGenerator .presetRow` 間距改 6px 並移除重複 margin
- [x] 1.5 `.objectGenerator__hint` 顏色修正
- [x] 1.6 `.objectSelection` 補上底色、圓角修正；`.objectSelection__tip` 圓角／內距／字級修正
- [x] 1.7 用 Figma MCP 重新核對 `1141:952` 六個子項目的精確間距（統一 10px），發現 `.charCounter` 共用的 `margin-top: -0.75rem` 跟父層 `.objectGenerator` 的 `gap` 疊加後會變成負間距，字數計數會貼到描述框裡；新增 `.objectGenerator .charCounter { margin-top: 0 }` 覆寫修正
- [x] 1.8 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「加入物件為文字描述生成，非從圖庫疊圖」Requirement 補上 Scenario 與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-add-object-panel`
