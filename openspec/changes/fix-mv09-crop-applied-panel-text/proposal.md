# Proposal：裁切側邊欄補上「已套用」文案／間距／顏色，對齊 1144:618

## 為什麼

使用者對照 Figma `1144:618`（panel_crop，屬於 `1144:570 MV-09e_圖片編輯_裁切套用後`）指出三個落差：間距沒對齊設計稿、少了分隔線、「完整呈現」四個字應該是綠色。

實際追查後發現根因比表面的三點更完整：裁切側邊欄從一開始就只有「編輯中」（605 系列）那一套文案，從沒有依「選定固定比例＝已套用」的邏輯切換成「已套用」（1144 系列）的文案——

- 尺寸文字：無論比例是否已套用，畫面永遠顯示「寬 {width} px ・ 高 {height} px ・ 旋轉 0°」；但 Figma 已套用時應顯示「已裁切為 {width} × {height} px（原圖 {origWidth} × {origHeight}）」
- 通路預覽標題：永遠顯示「各通路預覽」；已套用時應顯示「套用後各通路預覽」（`channelPreviewsApplied` 這個 i18n key 其實在更早一次修改就已經加進 `zh-Hant.ts`，但沒有真的接到畫面上，屬於遺漏）
- 通路預覽副標色：「完整呈現」目前跟「會被裁掉邊緣」共用同一顆 `<small>`，沒有 warn 時直接吃 `.preview small` 預設的灰色 `#b4b9c4`，從沒有綠色狀態；已套用時，非完整呈現的通路文字也該從「會被裁掉邊緣」（橘色警示）換成「上下留白」（灰色，中性說明，因為固定比例只是留白不是裁切遺失內容）

同時「已裁切為...」這段文字上下間距（跟上方比例列 12px、跟下方分隔線 4px）原本完全沒有內距，跟自訂模式共用的段落樣式直接貼齊上下兩側，這是「間距沒對齊設計稿」的根因。分隔線本身（`.channelPreviewsTitle` 的 `border-top`）其實在更早一次 fix 已經補上，此次確認邏輯正確、无需改動。

## 做了什麼

- `src/components/ImageEditorWorkspace.vue`
  - 尺寸文字、通路預覽標題、通路預覽副標文字／顏色皆依 `ratio === 'custom'`（編輯中，沿用舊文案）vs 固定比例（已套用，改用新文案）切換
  - 新增 `ORIGINAL_IMAGE_DIMENSIONS` 常數（1440×1080），跟 `cropOutputDimensions` 的 `original` 分支共用，避免原圖尺寸寫死兩次
  - `.cropPanel > p` 補上 `padding: 0.75rem 1rem 0.25rem`（對齊 606:883／1144:630 的 12px／4px 間距），並把 `.custom` 原本的 `margin-bottom` 移除，避免兩邊間距疊加成 20px
  - 新增 `.preview small.full { color: #54c14f }`（完整呈現＝綠色）
- `src/lang/zh-Hant.ts` / `src/lang/en.ts`：新增 `croppedToDynamic`、`paddedNote`；`en.ts` 補上原本漏掉的 `channelPreviewsApplied`
- `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上 Scenario 與 trace

## 影響範圍

只影響裁切面板側邊欄的文案／間距／顏色顯示邏輯，不影響裁切互動、畫布或其他面板。
