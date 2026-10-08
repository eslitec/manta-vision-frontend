# Proposal：修圖方式選擇按鈕樣式對齊 Figma

## 為什麼

使用者要求對照 Figma node `608:5370`（row_mode，「快速修飾」／「指令修圖」選擇列）核對樣式。比對後發現選中狀態（`.method.active`）只換了框線顏色，跟設計稿有三處落差：

1. 選中時底色應該變成 `#eff2fa`，實作維持白底
2. 選中時框線應該加粗為 `1.5px`，實作維持 `1px`（只換顏色）
3. 選中時標題文字應該變成 `#2e3567`，實作標題文字固定是 `#383c4b`，不隨選取狀態變色

未選中狀態（白底、`1px #d2d5dd` 框線、`#383c4b` 標題、`#606692` 副標）原本就與設計稿一致。

## 做了什麼

- `src/components/ImageEditorWorkspace.vue`：`.method.active` 補上 `background: #eff2fa` 與框線改為 `1.5px solid #2e3567`；新增 `.method.active strong { color: #2e3567 }`
- `openspec/specs/image-editor-ui/spec.md`：在「AI 修圖提供分項修飾與對比」Requirement 補上選中／未選中兩種樣式的描述與 Scenario，更新 trace

## 影響範圍

只影響 AI 修圖面板「快速修飾／指令修圖」選擇按鈕的選中樣式，不影響互動行為或計費邏輯。
