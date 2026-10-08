## 1. 核對與修正

- [x] 1.1 追查使用者回報「左半邊在高度不夠時候產生破圖」的根因：`.tryon` 只在既有的 `≥80.0625rem` 寬度斷點取得 `height:100%`（一路接到 `DefaultLayout.vue` 的 `.content{overflow-y:auto}`），但 `.tryon__input` 內容沒有任何 `overflow` 規則，高度不足時直接溢出容器造成畫面錯位
- [x] 1.2 比照 `GenerateVideoView.vue`／`GenerateImageView.vue` 已驗證過的兩段式捲動結構，把 `.tryon__input` 改成 `.tryon__scroll > .tryon__steps`（`flex:1; overflow-y:auto`，沿用本檔案既有的 `80.0625rem` 斷點）＋ `.tryon__fade`＋ `.tryon__sticky`（`flex-shrink:0`）結構
- [x] 1.3 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/tryon-ui/spec.md`：新增「左側設定面板在高度不足時面板內部捲動」Requirement 與 Scenario、trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-tryon-panel-scroll-y`
