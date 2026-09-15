## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `125:805`（dialog，確認生成影片）精確節點資料，逐項核對標題、內文、model_row／cost_row／bal_row 三列文字的字級與顏色
- [x] 1.2 model_row 的兩個 `span` 補上 `.confirm__label`／`.confirm__value` class，讓標籤與數值能分別上色（原本整列共用同一個顏色，無法呈現設計稿「標籤淺灰、數值藍灰」的分色）
- [x] 1.3 `.confirm__title`（18px／`#383c4b`）、`.confirm__msg`（16px／`#606692`／line-height 1.375）字級顏色修正
- [x] 1.4 `.confirm__row` 統一改 14px／line-height 1.4286，移除 `--sub` 修飾詞的整列色碼覆寫；新增 `.confirm__label`（`#b4b9c4`）／`.confirm__value`（`#606692`）；`.confirm__row--card .confirm__label` 覆寫成 `#383c4b`（本次消耗標籤比其餘兩列深）
- [x] 1.5 `.confirm__cost` 補上 16px 字級；`.confirm__balance` 改明確色碼 `#606692`，不再用 `inherit`
- [x] 1.6 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤
- [x] 1.7 使用者再次要求「確認 padding／margin 等等有沒有相同」，重新比對 `125:805` 節點的間距數值：`.confirm__modal` 圓角 16px→10px 並改成 `flex-col gap:16px`（取代原本各區塊各自的 `margin-bottom`）；`.confirm__head` icon 與標題間距 10px→12px；`.confirm__icon` 由 34px 圓形（`#faeeda`／`#ba7517`）改成 40px 圓角矩形（8px 圓角、`$blue-light`／`$blue-dark-500`、icon 字級 18px→24px）；`.confirm__rows` 移除原本的分隔線與 `padding-top`，改成 `flex-col gap:16px`；`.confirm__row` 移除自帶 `padding: 0.25rem 0`（改由父層 gap 控制間距）；`.confirm__row--card` 內距 `10px/12px`→統一 `12px`，移除 `margin`；`.confirm__cost`／`.confirm__balance` icon 與文字間距 6px→4px；`.confirm__actions` 按鈕間距 10px→12px
- [x] 1.8 `npx vue-tsc --noEmit` 與 `npx eslint` 再次確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/generate-video-ui/spec.md`：「送出生成前二次確認」Requirement 補上字級／顏色數值與 Scenario、trace
- [x] 2.2 同一 Requirement 補上間距／圓角數值，Scenario 擴充涵蓋 padding／margin／gap
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-confirm-dialog-typography`
