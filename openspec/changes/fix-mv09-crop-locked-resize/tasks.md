## 1. 設計與實作

- [x] 1.1 用 Figma MCP 取得 `605:4997`（panel_crop）與 `1144:570`（裁切套用後）確認設計稿沒有定義固定比例下的拖曳互動，屬於新提案
- [x] 1.2 與使用者討論「拖曳是否該變自訂 vs 維持比例縮放」，決定維持比例縮放，不悄悄切換 `ratio`
- [x] 1.3 `.cropFrame` 顯示條件從 `ratio === 'custom'` 改為 `tool === 'crop'`，新增 `.cropFrame--locked` 修飾類別讓固定比例維持無外框、無變暗遮罩的「已套用」外觀
- [x] 1.4 `startCropResize` 新增鎖定比例的等比例縮放分支（含錨點計算、邊界 clamp），並移除無條件把 `ratio` 改成 `custom` 的寫死邏輯
- [x] 1.5 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上 Scenario 與 trace

## 3. 新增拖曳裁切框移動位置（ingest，2026-09-09）

> 使用者反饋：點在裁切框可見範圍內按住拖曳時，應該要能移動整個取景框位置（不限固定比例或自訂），跟第 1 節的「角落把手等比例縮放」是不同的互動——先前只做了縮放，沒有做移動。commit `e8ef421` 補上這個互動。

- [x] 3.1 對齊 Requirement「裁切提供各通路預覽且不扣飼料」（commit `e8ef421`）：`ImageEditorWorkspace.vue` 新增 `startCropMove`，在 `.cropFrame` 本身掛 `pointerdown`，用滑鼠位移換算成 x/y 的百分比位移並夾限在畫布範圍內；角落把手的 `pointerdown` 已有 `.stop`，不會被這個新處理器攔截，移動與縮放兩種拖曳互不干擾
- [x] 3.2 `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上拖曳框身移動的描述與「使用者拖曳裁切框本身以移動取景位置」Scenario，並建立本 change 的 delta spec（`specs/image-editor-ui/spec.md`），trace 日期更新
- [x] 3.3 `npx vue-tsc --noEmit` 確認無錯誤

## 4. 驗證

- [x] 4.1 執行 `spectra validate fix-mv09-crop-locked-resize --strict` 與 `spectra analyze fix-mv09-crop-locked-resize`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 4.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-crop-locked-resize`
