## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `442:2860`（移至資料夾）與 `450:3221`（刪除確認）的精確節點資料
      （顏色、字重、邊框、投影），確認 review 反映的落差屬實
- [x] 1.2 修正 `LibraryView.vue` 的資料夾列與「建立」按鈕樣式（commit `d1567d3`）
- [x] 1.3 修正刪除確認彈窗警示 icon 顏色：`IconAlertTriangleFilled` 加 `color` prop，
      預設值維持原樣不影響其他畫面（commit `d1567d3`）
- [x] 1.4 修正素材名稱過長時的 `text-overflow: ellipsis`（commit `d1567d3`）
- [ ] 1.5 回覆 PR review：說明修法並請 reviewer 複查

## 2. Ingest

- [x] 2.1 `openspec/specs/library-management-ui/spec.md` 的「批次移動素材到資料夾」與
      「批次刪除素材需要明確確認」兩個 Requirement 的 trace 補上本次 `source`／`updated`
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-library-dialog-figma-mismatch`
