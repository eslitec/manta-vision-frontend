## 1. dirty 判斷改為快照比較

- [x] 1.1 落地設計決策「決策 1：用「已儲存快照」的深層比較取代手動翻轉的 boolean」：`src/views/BrandSettingsView.vue` 新增 `savedSnapshot` 狀態，`dirty` 改成 `computed`，比較 `profile` 與 `savedSnapshot` 是否相同
- [x] 1.2 `store.load()` 成功載入後，同步把當下的 `profile` 內容存成 `savedSnapshot`；`profile` 尚未載入完成時，`savedSnapshot` 對應相同的初始值，讓 `dirty` 一開始就是 `false`
- [x] 1.3 `onSave` 成功送出後，把儲存後的 `profile` 內容存成新的 `savedSnapshot`
- [x] 1.4 落地設計決策「決策 2：`onCancel` 不需要再手動把 `dirty` 設回 `false`」：移除 `onCancel` 裡原本手動賦值 `dirty.value = false` 的程式碼，改為依賴 `profile` 還原後 computed 自動重新計算
- [x] 1.5 移除原本的 `watch(profile, () => (dirty.value = true), { deep: true })`

## 2. 驗證

- [x] 2.1 對齊 Requirement「儲存設定按鈕反映實際的未儲存變更狀態」——瀏覽器手動驗證：首次進入品牌設定頁、資料載入完成、未變更任何欄位時，「儲存設定」按鈕為 disable
- [x] 2.2 對齊 Requirement「儲存設定按鈕反映實際的未儲存變更狀態」——瀏覽器手動驗證：變更任一欄位後按鈕變成可點擊；儲存成功後按鈕變回 disable
- [x] 2.3 對齊 Requirement「儲存設定按鈕反映實際的未儲存變更狀態」——瀏覽器手動驗證：儲存成功後切換到「飼料用量」頁再切回「品牌視覺識別」分頁，未做新變更時按鈕仍維持 disable
- [x] 2.4 對齊 Requirement「儲存設定按鈕反映實際的未儲存變更狀態」——瀏覽器手動驗證：變更欄位後點擊「取消」，按鈕變回 disable
- [x] 2.5 `npm run lint` 與 `npx vue-tsc --noEmit` 通過
- [x] 2.6 執行 `spectra validate fix-brand-settings-save-button-dirty-state --strict` 與 `spectra analyze fix-brand-settings-save-button-dirty-state`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 2.7 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-brand-settings-save-button-dirty-state`
