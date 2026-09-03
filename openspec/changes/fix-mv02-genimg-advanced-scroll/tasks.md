## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `1147:593`（row_advanced）、`1147:746`（adv_panel）、`1147:580`（scroll_area，含整個左側面板的固定高度捲動架構）精確節點資料，並比對 `_variables.scss` 實際色碼（`$blue-light` #eff2fa、`$blue-dark-500` #2e3567、`$gray` #d2d5dd 等）確認落差
- [x] 1.2 參考 `GenerateVideoView.vue` 既有的兩段式捲動結構（`sync-mv-04-design` 2026-08-21 決策：`.video__scroll`／`.video__sticky`），把 `.genimg__input` 改成同款 `.genimg__scroll > .genimg__steps`（`flex:1; overflow-y:auto`）＋ `.genimg__fade`＋ `.genimg__sticky`（`flex-shrink:0`）結構，讓「進階設定」展開時捲動只發生在 `section.panel.genimg__input` 內部
- [x] 1.3 `.advanced` 收合列邊框／圓角／高度／內距／字級／顏色對齊 `row_advanced`（1147:593）
- [x] 1.4 `.adv__label`／`.adv__val`／`.adv__hint` 字級顏色對齊 `adv_panel`（1147:746）子節點
- [x] 1.5 負面提示欄改為 56px 高、圓角 18px 的 `textarea`，補上即時字數計數（`X / 200`）
- [x] 1.6 種子欄補上「隨機」帶入按鈕、「鎖定」切換按鈕與下方提示文字；新增「恢復預設值」列
- [x] 1.7 `zh-Hant.ts`／`en.ts` 補上新增文案的中英翻譯
- [x] 1.8 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/generate-image-ui/spec.md`：「圖生圖頁面呈現對齊設計稿」Requirement 補上 Scenario 與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv02-genimg-advanced-scroll`
