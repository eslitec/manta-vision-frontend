# Proposal：LINE 圖文通路縮圖上下置中

## 為什麼

PR review（`nelsonliu-eslitec`）留言「Line 圖文的 preview 好像是上下置中」，並附上 Figma（node `605-4963`，裁切預覽畫面的通路預覽格）連結請確認。

對照 Figma `606:922`（cell_LINE 圖文）發現：LINE 圖文是四個通路裡唯一橫向（16:9）的格式，縮圖本身比其他三個通路矮，Figma 用 `thumb_wrap`（flex 置中）把這個較矮的縮圖在跟其他通路等高的格子裡「上下置中」（各留約 27px 空白）。

實作 `.preview__thumb.wide` 原本用 `margin-top: 3.25rem` 把整段落差（3.25rem）都塞在縮圖上方，縮圖因此貼齊格子底部，而不是像設計稿一樣上下置中——review 反映的落差屬實。

## 做了什麼

- `src/components/ImageEditorWorkspace.vue`：`.preview__thumb.wide` 改成 `margin-top: 1.625rem` + `margin-bottom: 1.875rem`，讓 3.25rem 的高度落差平均分配在上下（各 1.625rem，扣掉維持不變的 0.25rem 縮圖與說明文字間距），縮圖因此在跟同一列 FB 貼文等高的格子裡置中
- `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上 Scenario 與 trace

## 影響範圍

只影響裁切面板「各通路預覽」格線裡 LINE 圖文縮圖的垂直位置，不影響其他三個通路或任何互動行為。
