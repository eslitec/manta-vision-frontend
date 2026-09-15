## 1. 核對與修正

- [x] 1.1 追查 PR review 留言反映的問題：`isActive('/')` 只用嚴格相等比對，`router/routes.ts` 裡生成工具頁面都掛在獨立的 `/generate/*` 子路由，離開 `/` 後「AI 生成工作台」項目就失去選取狀態
- [x] 1.2 `DefaultLayout.vue` 新增 `NavItem` 型別與 `activePrefixes` 欄位，「AI 生成工作台」補上 `['/', '/generate']`；`isActive` 改成依 prefix 陣列逐一比對（`/` 嚴格相等、其餘 `startsWith`）
- [x] 1.3 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/home-workbench-ui/spec.md`：「側邊欄標示目前所在區塊」Requirement 補上 Scenario 與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-sidebar-active-generate-routes`
