## 1. Class 命名

- [x] 1.1 交付 **自有 class 使用 BEM 與 camelCase 語意片段**，依照 **保留 BEM 分隔符，每個語意片段使用 camelCase** 的決策，同步修改 Vue templates、動態 bindings 與 SCSS selectors。
- [x] 1.2 保留第三方 class contract，並確認沒有未核准的自有 kebab-case class 殘留。

## 2. CSS 單位

- [x] 2.1 交付 **可縮放的 UI 尺寸使用 rem**，依照 **區分可縮放單位與像素精確裝飾** 的決策，將字體、尺寸、間距與定位以 16px baseline 換算。
- [x] 2.2 交付 **像素精確裝飾維持 px**，依照 **區分可縮放單位與像素精確裝飾** 的決策，保留 border、radius、shadow、breakpoint、outline 與 SVG 幾何值，並稽核所有剩餘 `px`。

## 3. 驗證

- [x] 3.1 執行 Prettier、ESLint、Vitest、production build 與 Spectra strict validation。
