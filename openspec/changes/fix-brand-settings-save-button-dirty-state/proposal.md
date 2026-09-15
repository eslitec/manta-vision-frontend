## Problem

品牌設定頁（`/settings`，「品牌資訊維護」）的「儲存設定」按鈕，disable 狀態在兩種情境下都不正確：

1. 使用者第一次進入品牌設定頁時，即使還沒有更動任何欄位，「儲存設定」按鈕就已經是可點擊（未 disable）的狀態。使用者預期：品牌設定既已儲存過，沒有變動任何欄位時按鈕應該維持 disable。
2. 使用者成功儲存設定後，按鈕正確變成 disable；但切換到別的分頁（例如「飼料用量」）再切回「品牌視覺識別」分頁後，按鈕又變回可點擊狀態，即使使用者沒有變動任何資料。

## Root Cause

`src/views/BrandSettingsView.vue` 用一個手動翻轉的 boolean（`dirty`）代表「是否有未儲存的變更」，初始值就是 `true`，只靠 `watch(profile, () => (dirty.value = true), { deep: true })` 把它設成 `true`，從未真正跟「已儲存的資料」做比對；只有 `onSave`／`onCancel` 執行成功後才會手動把它設回 `false`。

兩個症狀是同一個根因：

- 症狀 1：頁面掛載時 `dirty` 已經是 `true`（初始值），`store.load()` 從後端把品牌資料撈回來、寫入 `profile` 是非同步的，在那之前「儲存設定」按鈕的 disable 判斷就已經根據 `dirty === true` 算過一輪，顯示為可點擊。
- 症狀 2：品牌設定頁的路由沒有套用 `<keep-alive>`，切換到別的分頁再切回來會讓 `BrandSettingsView` 整個重新掛載（不是保留元件狀態），`const dirty = ref(true)` 重新從初始值 `true` 開始，跟症狀 1 是完全相同的機制，只是觸發時機是「重新掛載」而不是「第一次掛載」。

## Proposed Solution

把 `dirty` 從手動翻轉的 boolean 改成一個真正做比較的 `computed`：

- 新增一個「已儲存的品牌設定快照」（例如 `savedSnapshot`），在 `store.load()` 成功載入後、以及 `onSave` 成功送出後，都把當下的 `profile` 內容存一份快照進去
- `dirty` 改成 `computed`：深層比較目前的 `profile` 與 `savedSnapshot` 是否相同，不同才是 `true`
- `profile` 尚未載入完成（例如仍是 `null`／初始空值）時，`dirty` SHALL 為 `false`（按鈕維持 disable），不能因為「快照還沒建立」就被誤判成「有變更」
- 移除既有的 `watch(profile, () => (dirty.value = true), { deep: true })`，改由 computed 的比較邏輯取代；`onCancel`（取消變更、還原成上次儲存的內容）之後 `dirty` 也應該因為 `profile` 被還原成跟快照一致而自動變回 `false`，不需要再手動設定

## Non-Goals

- 不處理品牌色票「重新偵測後只能儲存前 3 個顏色」的問題——那是後端 `/brand` API 目前把色票欄位寫死成 `primary`／`secondary`／`accent` 三個具名欄位（`src/api/real.ts` 的 `COLOR_SLOTS`／`buildColorPalette`／`toColors`）造成的，需要後端 API 支援更多色票欄位才能真正修好，不是前端單方能修的問題，這次不動
- 不改變「基本資料」「文案風格」「合規與授權」其他分段的儲存邏輯，這次只處理「是否有未儲存變更」這個判斷本身，適用於整個品牌設定頁（所有分段共用同一個 `profile`／`dirty` 機制），不是只改「視覺識別」分頁
- 不新增路由層級的 `<keep-alive>`——用比較快照的方式讓元件重新掛載時也能正確重建 dirty 狀態，不需要改變現有的路由/元件生命週期設計

## Success Criteria

- 使用者第一次進入品牌設定頁、資料載入完成後，未做任何變更時「儲存設定」按鈕維持 disable
- 使用者變更任一欄位後，按鈕變成可點擊（enabled）
- 使用者成功儲存後，按鈕變回 disable
- 使用者儲存成功後切換到別的分頁（例如「飼料用量」）再切回品牌設定頁，未做任何新變更時按鈕仍然維持 disable
- 使用者點擊「取消」還原變更後，按鈕變回 disable

## Impact

- Affected specs: brand-settings-ui
- Affected code:
  - Modified: src/views/BrandSettingsView.vue
