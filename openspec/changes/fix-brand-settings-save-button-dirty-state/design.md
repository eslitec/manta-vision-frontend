## Context

`src/views/BrandSettingsView.vue` 目前用 `const dirty = ref(true)` 搭配 `watch(profile, () => (dirty.value = true), { deep: true })` 來判斷「儲存設定」按鈕要不要 disable。這個機制只會把 `dirty` 設成 `true`，從來沒有把它設回 `false` 的地方，除了 `onSave`／`onCancel` 執行成功後手動指定。因為初始值直接寫死 `true`，頁面掛載當下（含路由切換造成的重新掛載）按鈕就已經處於「未儲存」狀態，跟畫面上實際「資料剛從後端載入、使用者還沒動過任何欄位」的狀態不符。

## Goals / Non-Goals

**Goals:**

- 「儲存設定」按鈕的 disable 狀態，正確反映「目前表單內容是否跟已儲存的品牌設定不同」，不論是首次載入、重新掛載、或使用者編輯／取消後

**Non-Goals:**

- 不處理色票只能存 3 個顏色的後端限制問題（見 proposal.md Non-Goals）
- 不改變品牌設定的儲存 API 呼叫方式或錯誤處理邏輯，只改動「dirty 判斷」這一段

## Decisions

### 決策 1：用「已儲存快照」的深層比較取代手動翻轉的 boolean

手動翻轉的 boolean（`ref(true)` + 只會設成 `true` 的 watch）沒有辦法正確表達「回到已儲存狀態」這件事——它只知道「有東西變了」，不知道「變回去了」。改成保存一份 `savedSnapshot`（品牌設定上次成功載入或儲存時的內容），`dirty` 改成 `computed(() => !isEqual(profile.value, savedSnapshot.value))`（或等效的深層比較，沿用專案既有的比較方式，不引入新的深層比較函式庫——先確認 `lodash`／`lodash-es` 是否已經是既有依賴，若沒有則用 `JSON.stringify` 比較，因為 `profile` 是純資料物件，沒有函式或循環參照，`JSON.stringify` 比較在這個情境下是安全且足夠的）。

`savedSnapshot` 的更新時機：
- `store.load()` 成功、`profile` 被寫入後，同步更新 `savedSnapshot` 為 `profile` 當下內容的深拷貝
- `onSave` 成功送出後，`savedSnapshot` 更新為儲存後的 `profile` 內容
- `profile` 尚未載入完成（例如仍是初始值或 `null`）時，`savedSnapshot` 也對應為相同的初始值，讓 `dirty` 一開始就是 `false`，不會誤判成「有變更」

### 決策 2：`onCancel` 不需要再手動把 `dirty` 設回 `false`

`onCancel` 現有邏輯是把 `profile` 還原成上次儲存的內容。改成 computed 之後，`profile` 被還原成跟 `savedSnapshot`相同的內容，`dirty` 會自動重新計算成 `false`，不需要再額外手動賦值——移除 `onCancel` 裡原本手動設定 `dirty.value = false` 的那一行，避免兩套邏輯（手動賦值＋computed 比較）同時存在造成之後維護時的混淆。

## Implementation Contract

**行為**：品牌設定頁「儲存設定」按鈕的 disable 狀態 SHALL 只反映「目前表單內容是否跟已儲存的品牌設定不同」：
- 資料尚未從後端載入完成時，按鈕 SHALL disable
- 資料載入完成、使用者尚未變更任何欄位時，按鈕 SHALL disable
- 使用者變更任一品牌設定欄位後，按鈕 SHALL 變成可點擊
- 使用者成功儲存後，按鈕 SHALL 變回 disable
- 使用者點擊「取消」還原變更後，按鈕 SHALL 變回 disable
- 使用者離開品牌設定頁再返回（造成元件重新掛載）時，若沒有新的變更，按鈕 SHALL 維持 disable

**資料形狀**：新增一個元件內部狀態 `savedSnapshot`，型別跟 `profile` 一致（品牌設定的資料形狀，沿用既有型別，不新增型別定義）；不涉及任何 API 回應格式或 Pinia store 狀態的變動。

**失敗模式**：`store.load()` 若載入失敗，`profile` 維持原狀（既有錯誤處理邏輯不變），`savedSnapshot` 也不會被寫入無效的資料，按鈕 disable 狀態不受影響。

**驗收標準**：
- 瀏覽器手動驗證五種情境（見 proposal.md Success Criteria）：首次載入未變更、變更後、儲存後、切換分頁再返回未變更、取消變更後，「儲存設定」按鈕的 disable 狀態皆正確
- `npm run lint` 與 `npx vue-tsc --noEmit` 通過

**範圍邊界**：僅限 `src/views/BrandSettingsView.vue` 的 `dirty` 判斷邏輯與 `savedSnapshot` 新增。不修改 `src/stores/brand.ts`、`src/api/real.ts`、`src/api/mock.ts`，也不修改任何其他分頁或元件。

## Risks / Trade-offs

- [風險] 用 `JSON.stringify` 做深層比較，如果 `profile` 物件的鍵值順序在不同時間點不一致（理論上 Vue 的響應式物件屬性順序應該穩定，但如果之後有人動態新增/刪除欄位），可能導致誤判 → [緩解] `profile` 的資料形狀是固定的型別（來自既有的品牌設定型別定義），欄位不會動態增減，順序穩定；如果之後真的需要更嚴謹的比較，可以再引入專門的深層比較函式庫，這次先用足夠簡單、不需要新增依賴的方式解決
