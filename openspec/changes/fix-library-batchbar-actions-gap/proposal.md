## Problem

`src/views/LibraryView.vue` 的 `.batchbar__actions`（批次操作列裡「移至資料夾」「刪除」等動作按鈕的容器）目前的按鈕間距跟預期不符。

## Root Cause

`.batchbar__actions` 使用 `@include flex(flex-start, center, 1.25rem)`，第三個參數（gap）目前是 `1.25rem`，使用者從瀏覽器 DevTools 檢查後指出應該是 `0.5rem`。

## Proposed Solution

把 `.batchbar__actions` 的 `flex` mixin 第三個參數從 `1.25rem` 改成 `0.5rem`，只改這一個數值。

## Non-Goals

- 不改動 `.batchbar` 其餘樣式屬性（背景、padding、`__selection`、`__minus`、`__link`、`__action` 等其他子元素樣式）
- 不改動批次操作列以外的其他版面

## Success Criteria

- 批次操作列裡的動作按鈕間距為 `0.5rem`（8px）
- 其餘版面不變
- `npx vue-tsc --noEmit`、`npm run lint` 通過

## Impact

- Affected code:
  - Modified: src/views/LibraryView.vue
