## Why

團隊 review 已確立全專案的 BEM class 大小寫與 CSS 單位規範。將規範記錄為 Spectra change，可以避免不同頁面繼續採用互相衝突的命名及尺寸規則。

## What Changes

- 保留 BEM 結構，block、element、modifier 與狀態名稱中的多字詞統一使用 camelCase。
- 字體、元件尺寸、間距與定位使用 `rem`。
- border、radius、shadow、responsive breakpoint、outline，以及第三方或 SVG 幾何值維持 `px`。
- 使用 `1rem = 16px` 進行等值換算，維持預設環境下的視覺尺寸。

## Capabilities

### New Capabilities

- `frontend-style-conventions`：全專案 class 命名與 CSS 單位規範。

### Modified Capabilities

無。

## Impact

- 影響 `src/` 內的 Vue templates、動態 class bindings 與 scoped SCSS。
- Tabler Icons 等第三方 class 維持原名。
- 不改變路由、狀態或業務行為。
