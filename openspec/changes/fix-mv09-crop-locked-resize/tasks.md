## 1. 設計與實作

- [x] 1.1 用 Figma MCP 取得 `605:4997`（panel_crop）與 `1144:570`（裁切套用後）確認設計稿沒有定義固定比例下的拖曳互動，屬於新提案
- [x] 1.2 與使用者討論「拖曳是否該變自訂 vs 維持比例縮放」，決定維持比例縮放，不悄悄切換 `ratio`
- [x] 1.3 `.cropFrame` 顯示條件從 `ratio === 'custom'` 改為 `tool === 'crop'`，新增 `.cropFrame--locked` 修飾類別讓固定比例維持無外框、無變暗遮罩的「已套用」外觀
- [x] 1.4 `startCropResize` 新增鎖定比例的等比例縮放分支（含錨點計算、邊界 clamp），並移除無條件把 `ratio` 改成 `custom` 的寫死邏輯
- [x] 1.5 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上 Scenario 與 trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-crop-locked-resize`
