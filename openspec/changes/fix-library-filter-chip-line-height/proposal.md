## Problem

使用者用瀏覽器開發者工具指出圖庫管理中心來源篩選 chip（全部／上傳／AI 生成／編輯產物）的 `.chip` 有多餘的 `line-height: 1`，造成文字垂直度量跟其他同尺寸的 chip／pill 元件不一致。

## Root Cause

`LibraryView.vue` 的 `.chip` 樣式沿用早期草稿時多寫了一行 `line-height: 1`，跟專案裡其他 chip／pill 類元件（例如 `AppPill`）沒有這行覆寫、依賴預設行高的做法不一致，屬於單純的樣式殘留，沒有特別的設計理由。

## Proposed Solution

- `LibraryView.vue` 的 `.chip` 移除 `line-height: 1` 這一行，讓文字行高回到瀏覽器／字型預設值，跟其他 chip／pill 元件一致

## Non-Goals

- 不調整 `.chip` 的其他樣式（padding、border-radius、字級、顏色、選中狀態），這些都跟設計稿一致，不需要改
- 不影響其他頁面的 chip 或 pill 元件（`AppPill`、標籤頁 `AppTab` 等各自獨立）

## Success Criteria

- 圖庫管理中心的來源篩選 chip 不再套用 `line-height: 1`
- 視覺上 chip 文字垂直置中效果與其他頁面同尺寸的 chip／pill 一致
- `npx vue-tsc --noEmit` 通過

## Impact

- Affected code:
  - Modified: src/views/LibraryView.vue（移除 `.chip` 的 `line-height: 1`）
