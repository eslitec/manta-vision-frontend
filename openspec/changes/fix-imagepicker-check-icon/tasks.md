## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `1246:2412`（`thumb`）與其手足節點 `1246:2416`／`1246:2423`（`sel_check` 選取／未選取兩種狀態）、`194:36`（`ic_ok` 勾勾圖示）的設計上下文與截圖
- [x] 1.2 逐項比對徽章的尺寸（22×22）、圓角（11px）、顏色（選取 `#2e3567`／未選取白底 `#d2d5dd` 邊框 0.9 透明度）、位置（top/right 6px）——確認皆與目前 `.pick__check` CSS 一致，落差只在勾勾圖示本身的造型
- [x] 1.3 用 Playwright 分別渲染現有 `IconCheck.vue` 的 path 與 Figma `ic_ok` 截圖並排比對，確認現有 path 明顯不對稱、粗細不均
- [x] 1.4 `IconCheck.vue` 改成 stroke-based 的對稱勾勾（`viewBox 24x24`，`M5 13l5 5L20 7`），並用 Playwright 渲染新版本再次比對，確認視覺與 Figma 一致
- [x] 1.5 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/library-management-ui/spec.md`：新增「素材挑選彈窗以打勾徽章標示已選取項目」Requirement、Scenario 與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-imagepicker-check-icon`
