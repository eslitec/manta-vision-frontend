# Proposal：文字屬性面板補上內距與分隔線

## 為什麼

使用者要求核對 Figma node `1157:619`（文字圖層屬性面板「props」）跟實作是否一致。逐項比對顏色、字型、色票、文字內容都吻合，但發現 `.properties` 這個容器本身：

1. 沒有設定 `padding`，導致輸入框、字型下拉、色票列會貼齊面板左右邊界，跟設計稿 16px 內距不符
2. 上方沒有分隔線，跟設計稿「圖層清單」與「文字屬性」之間的 1px 分隔線不符

同一個右側面板底下的 `.aiCost`、`.objectGenerator` 都有補這組 `border-top` + `padding` 樣式，只有 `.properties` 漏掉，判斷是既有的遺漏，跟本次其他修正無關。

## 做了什麼

- `src/components/ImageEditorWorkspace.vue`：`.properties` 補上 `border-top: 1px solid #d2d5dd; padding: 0 1rem 1rem;`，對齊 `.aiCost` 既有的樣式模式
- `openspec/specs/image-editor-ui/spec.md`：在「字型選單的九個字體家族與 Figma list_font 逐項一致」Requirement 補上面板內距／分隔線的描述與 Scenario，更新 trace

## 影響範圍

只影響編輯畫布右側「文字屬性」面板（選取文字圖層時顯示）的間距與分隔線視覺，不影響任何互動行為。
