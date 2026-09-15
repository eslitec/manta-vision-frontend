## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `1246:2412`（`thumb`）與其手足節點 `1246:2416`／`1246:2423`（`sel_check` 選取／未選取兩種狀態）、`194:36`（`ic_ok` 勾勾圖示）的設計上下文與截圖
- [x] 1.2 逐項比對徽章的尺寸（22×22）、圓角（11px）、顏色（選取 `#2e3567`／未選取白底 `#d2d5dd` 邊框 0.9 透明度）、位置（top/right 6px）——確認皆與目前 `.pick__check` CSS 一致，落差只在勾勾圖示本身的造型
- [x] 1.3 用 Playwright 分別渲染現有 `IconCheck.vue` 的 path 與 Figma `ic_ok` 截圖並排比對，確認現有 path 明顯不對稱、粗細不均
- [x] 1.4 `IconCheck.vue` 改成 stroke-based 的對稱勾勾（`viewBox 24x24`，`M5 13l5 5L20 7`），並用 Playwright 渲染新版本再次比對，確認視覺與 Figma 一致
- [x] 1.5 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤
- [x] 1.6 使用者提供徽章完整原始 SVG，發現第一輪誤判：`sel_check` 其實是「深藍外圈 `#2e3567`＋綠色同心圓 `#54c14f`（半徑約外圈一半）＋白色勾勾」三層疊加，不是單純深藍圓＋白勾；第一輪只把 `ic_ok` 的綠色圓誤判成「這個 instance 被 override 拿掉了」
- [x] 1.7 `IconCheck.vue` 改成完整還原三層徽章的原始 SVG（`viewBox 22x22`，`rect` 深藍 22×22 全滿 + 同心 `path` 綠色 + 白色勾勾 `path`），顏色直接寫死（固定多色徽章，非可換色單色圖示）
- [x] 1.8 `ImagePickerDialog.vue`：`.pick__check svg` 尺寸從 13px 改 100%（填滿整個 22px 徽章框）；`.isOn` 移除自己的 `background`（改由圖示本身畫出深藍圓，避免重複疊色）；`border-color: transparent` 改成 `border-width: 0`（`box-sizing: border-box` 下，留 1px 透明邊框會讓 svg 100% 少算 2px）
- [x] 1.9 用 Playwright 渲染修正後的完整三層徽章，確認與使用者提供的原始 SVG、Figma 截圖一致
- [x] 1.10 `npx vue-tsc --noEmit` 與 `npx eslint` 再次確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/library-management-ui/spec.md`：新增「素材挑選彈窗以打勾徽章標示已選取項目」Requirement、Scenario 與 trace
- [x] 2.2 同一 Requirement 依第二輪核對結果修正為「深藍外圈＋綠色同心圓＋白色勾勾」三色徽章的正確描述
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-imagepicker-check-icon`
