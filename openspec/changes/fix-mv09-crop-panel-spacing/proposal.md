# Proposal：裁切面板比例列間距與各通路預覽細節對齊設計稿

## 為什麼

使用者針對裁切面板（Figma node `605:4997`）截圖詢問「上下兩排的按鈕為什麼間隔這麼大」，並附上目前畫面：比例 chips（原始／1:1／4:5／9:16／16:9）與下方「自訂」按鈕之間有明顯過大的空白。

對照 Figma `606:870`（row_ratio）發現：整個 row_ratio 高度為 66px，內含第一排比例 chips（29px）與「自訂」（29px），中間只留 8px 間距。但實作把 `.ratioRow`（只包住第一排 chips）的 `min-height` 設成 `4.125rem`（=66px，整個 row_ratio 的高度），單行 chips 貼齊頂部後，底下卻多出約 37px 空白才接到外面另一個獨立的 `.custom`（自訂）按鈕，造成兩排按鈕間距遠大於設計稿的 8px。

同時比對 `606:885`（divider）與各通路預覽 cell（如 `606:889`）也發現兩個既有落差：
1. 「寬 1080px・高 1080px・旋轉 0°」與「各通路預覽」標題之間，設計稿有一條 1px `#d2d5dd` 分隔線，實作沒有。
2. 各通路預覽卡片標題（如「IG 貼文 1:1」）字色設計稿是 `#2e3567`，實作沒有單獨設色，繼承 `.workspace` 的 `#383c4b`，深藍色不夠深。

## 做了什麼

- `src/components/ImageEditorWorkspace.vue`
  - `.cropPanel .ratioRow` 的 `min-height` 從 `4.125rem` 改為 `1.8125rem`（貼合單行 chips 高度），`.custom` 補上 `margin-top: 0.5rem`，讓比例列與「自訂」間距對齊 Figma 的 8px
  - 新增 `.channelPreviewsTitle`（`h3` 加 class）搭配 `border-top: 1px solid #d2d5dd`，補上「各通路預覽」標題上方的分隔線
  - 新增 `.preview strong { color: #2e3567; }`，修正通路名稱字色
- `openspec/specs/image-editor-ui/spec.md`：「裁切提供各通路預覽且不扣飼料」Requirement 補上比例列間距與分隔線／標題字色的 Scenario 與 trace

## 影響範圍

只影響裁切面板本身（比例選擇列間距、各通路預覽標題分隔線與卡片標題字色），不影響其他面板或互動行為。
