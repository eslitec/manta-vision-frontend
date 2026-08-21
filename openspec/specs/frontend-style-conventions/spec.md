# frontend-style-conventions Specification

## Purpose

定義前端自有樣式的命名與單位慣例：class 命名沿用 BEM 結構但多字詞片段使用 camelCase；字體、元件尺寸、間距與定位偏移以 16px baseline 換算成 `rem`，讓使用者調整瀏覽器字級時整體等比縮放；border、radius、shadow、breakpoint、outline 與 SVG 幾何值則維持 `px`，保留像素精確度與外部 contract。適用於 `src/` 底下的 Vue template、動態 class binding 與 scoped SCSS；第三方套件（例如 Tabler Icons）的 class 名稱不在此規範內。

## Requirements

### Requirement: 自有 class 使用 BEM 與 camelCase 語意片段

應用程式自有 CSS class SHALL 保留 BEM 結構，並讓多字詞的 block、element、modifier 與狀態名稱使用 camelCase。

#### Scenario: 定義多字詞 element

- **WHEN** Vue template 與 SCSS 需要命名任務進度 element
- **THEN** 兩處都使用 `task__barFill`，而不是 `task__bar-fill`

#### Scenario: 使用第三方 class

- **WHEN** 畫面使用 `ti-alert-triangle` 等 Tabler icon class
- **THEN** 外部 class contract 維持原名

---

### Requirement: 可縮放的 UI 尺寸使用 rem

字體、元件尺寸、間距與定位偏移 SHALL 使用 `rem`，並以 16px baseline 換算。

#### Scenario: 換算既有間距

- **WHEN** 將既有 `padding: 16px` 宣告套用專案規範
- **THEN** 該宣告變成 `padding: 1rem`，且預設渲染尺寸維持不變

---

### Requirement: 像素精確裝飾維持 px

border、radius、shadow、responsive breakpoint、outline 與 SVG 幾何值 SHALL 在需要像素精確度或外部 contract 時維持 `px`。

#### Scenario: 整理一像素邊框

- **WHEN** 元件使用 `border: 1px solid`
- **THEN** border 維持 `1px`，不換算成 `rem`
