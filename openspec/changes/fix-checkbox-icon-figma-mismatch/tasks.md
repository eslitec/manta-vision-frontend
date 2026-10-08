## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `441:2640` 裡 `chk` 元件的實際定義，確認 review 反映的落差屬實：
      Figma 打勾是純文字「✓」字元，不是向量圖示
- [x] 1.2 修正 `AppCheckbox.vue`：打勾改用文字字元＋粗體字重，拿掉不再使用的 `IconCheck` import
      （commit `4cda120`）
- [x] 1.3 回覆 PR review：確認差異屬實並說明修法

## 2. Ingest

- [x] 2.1 `openspec/specs/shared-button-components/spec.md` 引用 `AppCheckbox.vue` 的 trace 補上
      本次 `source`／`updated` 日期

## 3. 打勾符號改回向量圖示（ingest，2026-09-08，反轉第 1 節的結論）

> 使用者提供實際的 Figma 原始匯出 SVG，確認打勾符號是向量圖示，不是第一輪判斷的文字字元。

- [x] 3.1 對齊 Requirement「AppCheckbox 打勾符號 SHALL 使用向量圖示，不使用文字字元」（commit `662b9a4`）：
      `AppCheckbox.vue` 的 `.appCheckbox__check` 改回 `svg`＋`path`（`viewBox 0 0 18 18`、
      `fill="currentColor"`），移除純文字「✓」與 `font-weight: 700`
- [x] 3.2 `openspec/specs/shared-button-components/spec.md`：新增這個獨立 Requirement，記錄
      SVG 的具體規格與兩輪決策沿革（第一輪為何判斷成文字、第二輪為何改回向量圖示），
      避免只補 trace 日期、沒有落地規範文字的問題重演
- [x] 3.3 `npx vue-tsc --noEmit` 與全部既有單元測試（155 筆）皆通過

## 4. 驗證

- [x] 4.1 執行 `spectra validate fix-checkbox-icon-figma-mismatch --strict` 與
      `spectra analyze fix-checkbox-icon-figma-mismatch`，確認沒有 CRITICAL／WARNING 級別的發現
      （2026-09-09 重新執行：validate 通過，analyze 四項檢查皆 Clean，0 findings）
- [ ] 4.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-checkbox-icon-figma-mismatch`
