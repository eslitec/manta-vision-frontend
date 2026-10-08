## 背景

專案使用手寫 SCSS 與 BEM，但既有程式同時混用 kebab-case、綁定 HTML 標籤的名稱、依版面位置命名的 class，以及缺乏分類規則的 `px` 尺寸。

## 決策

### 保留 BEM 分隔符，每個語意片段使用 camelCase

自有 class SHALL 採用 `feedBadge`、`task__barFill`、`isActive` 等形式。BEM 的 `__` element 分隔符與 `--` modifier 分隔符維持不變。`ti-alert-triangle` 等第三方 class contract 不在修改範圍內。

### 區分可縮放單位與像素精確裝飾

字體、尺寸、間距與定位使用 `rem`；border、radius、shadow、breakpoint、outline 與 SVG 幾何值維持 `px`。既有數值以 16px root baseline 換算，讓預設環境下的版面維持視覺等值。

## 驗證方式

- 掃描 templates 與 SCSS，確認沒有未核准的自有 kebab-case class。
- 掃描剩餘 `px` 宣告，確認每一處都屬於允許保留的類別。
- 執行 Prettier、ESLint、Vitest 與 production build。
