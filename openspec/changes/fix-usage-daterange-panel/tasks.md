## 1. 核對與實作

- [x] 1.1 用 Figma MCP `get_design_context` 取得 `1151:862`（`panel_calendar`）完整結構與數值：`row_inputs`、`row_months`（含 `mh`／`weekdays`／`days`）、`row_quick`、`row_act`
- [x] 1.2 核對現有 `AppButton.vue` 的 `outline`／`primary` variant 與 `$btnBoxShadow`，確認跟設計稿 `btn_取消`／`btn_套用` 的 padding／圓角／陰影精確吻合，取消／套用按鈕直接沿用 `AppButton`，不刻新樣式
- [x] 1.3 核對 `AppPill.vue` 現有樣式，確認跟 `row_quick` 的 chip 規格（padding／圓角／字級／可點擊語意）不同，判斷不適合沿用，改在新元件內刻 `.quickChip`
- [x] 1.4 確認 `IconBack`／`IconNext`／`IconChevronDown` 已存在於 `src/components/icons/`，可直接沿用不用新刻
- [x] 1.5 讀 `UsageView.vue` 完整 `<script setup>`，確認 `customStart`／`customEnd`／`appliedCustomStart`／`appliedCustomEnd`／`customRangeValid`／`applyCustomRange`／`selectRange`／`periodData` 的既有資料流，設計新面板要接的整合點（只在「套用」時把 draft 交還，不動既有 apply 邏輯）
- [x] 1.6 讀 `useDismissableMenu.ts` 與既有消費者 `ImageEditorWorkspace.vue` 的用法，確認觸發按鈕跟面板要包在同一個 `ref` 容器內，避免 pointerdown 監聽跟 click handler 的開闔互踩
- [x] 1.7 新增 `src/components/DateRangeCalendarPanel.vue`：雙月曆面板（`draftStart`／`draftEnd` 內部狀態、日期格起訖/區間內樣式、月份導覽、快速選取、`apply`／`cancel` 事件）
- [x] 1.8 `src/views/UsageView.vue`：原生雙 input 改成觸發按鈕 + 下拉面板，接上 `useDismissableMenu`，`selectRange('custom')` 與再次點擊「自訂」chip 都會開啟面板，面板 `apply` 才呼叫既有 `applyCustomRange()`
- [x] 1.9 `src/lang/zh-Hant.ts`／`src/lang/en.ts`：`usage.customRange` 補上 `monthLabel`／`maxRangeHint`／`weekdays`／`quick`／`prevMonth`／`nextMonth`，`start`／`end` 文字對齊 Figma 短標籤
- [x] 1.10 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤
- [x] 1.11 用 Playwright 依實際 CSS 數值渲染面板靜態版本，核對雙月曆排版、輸入框邊框、起訖端點與區間內連续底色、chip／按鈕排版跟 Figma 截圖一致

## 2. Ingest

- [x] 2.1 `openspec/specs/usage-stats-ui/spec.md`：新增「自訂區間用雙月曆面板挑選日期」Requirement、Scenario 與 trace
- [x] 2.2 `openspec/specs/dismissable-menu-composable/spec.md`：既有 Requirement 的 trace 補上新消費者 `src/views/UsageView.vue`
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-usage-daterange-panel`
