## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `441:2640` 裡 `chk` 元件的實際定義，確認 review 反映的落差屬實：
      Figma 打勾是純文字「✓」字元，不是向量圖示
- [x] 1.2 修正 `AppCheckbox.vue`：打勾改用文字字元＋粗體字重，拿掉不再使用的 `IconCheck` import
      （commit `4cda120`）
- [x] 1.3 回覆 PR review：確認差異屬實並說明修法

## 2. Ingest

- [x] 2.1 `openspec/specs/shared-button-components/spec.md` 引用 `AppCheckbox.vue` 的 trace 補上
      本次 `source`／`updated` 日期
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-checkbox-icon-figma-mismatch`
