## 1. 移除舊的行內提示

- [x] 1.1 移除 `BrandSettingsView.vue` 頁尾原本的行內「已存入」文字提示：刪掉對應的 `span(v-if="saved")` 樣板、`saved` ref、`.brand__foot span` 這段 CSS（`color: #45b85b`、`font-size: 0.75rem` 那組），確認沒有其他地方還在引用 `saved` 這個變數名稱

## 2. 新增獨立 toast（decision 1：BrandSettingsView 自己刻一個外觀對齊的獨立 toast，不重用 GenerationToast.vue 元件本身）

> 本節（2.1～2.4、3.1、4.1、4.2、4.6）是第一版 toast 做法，已實作、驗證、commit（`b0a913c`），後續被使用者撤銷，改用第 5、6 節的「按鈕停用」方案。保留勾選狀態供追溯，不代表 toast 仍存在於程式碼中——見第 5 節的移除任務。

- [x] 2.1 落地設計決策「決策 1：BrandSettingsView 自己刻一個外觀對齊的獨立 toast，不重用 GenerationToast.vue 元件本身」：在 `BrandSettingsView.vue` 新增一個 local boolean ref（例如 `saveToast`）控制顯示狀態，樣板結構參考 `GenerationToast.vue`（`Teleport(to="body")`、卡片容器、`IconCheckCircle` 圖示、標題＋訊息文字、關閉按鈕），但完全不 import 或呼叫 `generationTasks` store 的任何方法
- [x] 2.2 落地設計決策「決策 2：新 toast 固定在畫面右下角，不用右上角」：新 toast 的 CSS 用 `position: fixed; bottom: 0; right: 0`（而非 `GenerationToast.vue` 的 `top: 0; right: 0`），沿用 `$boxShadowDark`、圓角、卡片內距等既有視覺數值，確保跟 `GenerationToast.vue` 視覺一致但不重疊
- [x] 2.3 落地設計決策「決策 4：自動消失時間比照 GenerationToast.vue 的 6 秒」：`watch` 該 boolean ref，`true` 時啟動 6000ms 的 `setTimeout` 自動關閉，`false` 或元件卸載時清掉計時器（比照 `GenerationToast.vue` 現有寫法）
- [x] 2.4 新增手動關閉按鈕：點擊後立即把 boolean ref 設回 `false` 並清掉還在跑的計時器

## 3. i18n 與觸發邏輯（toast 版本，已撤銷，見第 5 節）

- [x] 3.1 落地設計決策「決策 3：新增專屬 i18n key，不再借用 `common.saved`」：在 `src/lang/zh-Hant.ts` 新增 `brandSettings.saveToast.title`（「已儲存」）與 `brandSettings.saveToast.message`（「品牌設定已成功更新」），`src/lang/en.ts` 補上對應英文翻譯與相同的 key 結構
- [x] 3.2 修改 `onSave()`：`await store.save()` 成功 resolve 後才把新 toast 的 boolean ref 設為 `true`；`store.save()` 拋出例外時維持現有的錯誤處理路徑，不觸發這個新 toast

## 4. 對齊 Requirement 與驗證（toast 版本，已撤銷，見第 5、6 節）

- [x] 4.1 對齊 Requirement「儲存設定成功時提供明顯的視覺回饋」（toast 版本的 Requirement 標題，spec 已改寫成第 5 節對應的新標題）：確認三個 Scenario（存檔成功顯示 toast、手動關閉、存檔失敗不顯示）在實作中都成立
- [x] 4.2 瀏覽器手動驗證：登入後進入 `/settings`，編輯任一欄位並按下「儲存設定」，確認右下角出現含「已儲存」標題與「品牌設定已成功更新」訊息的 toast 卡片，等待 6 秒確認自動消失；再存一次並手動點擊關閉按鈕，確認立即消失
- [x] 4.3 `npm run lint` 通過
- [x] 4.4 `npx vue-tsc --noEmit` 通過
- [x] 4.5 `npx vitest run src/api/real.spec.ts src/stores/stores.spec.ts` 維持全過（確認這次改動沒有動到 API／store 層邏輯）
- [x] 4.6 執行 `spectra validate fix-brand-settings-save-toast --strict` 與 `spectra analyze fix-brand-settings-save-toast`，確認沒有 CRITICAL／WARNING 級別的發現

## 5. 移除 toast，改為「存檔後按鈕停用直到表單被修改」

- [x] 5.1 移除 toast 相關程式碼：刪除 `BrandSettingsView.vue` 裡的 `saveToast` ref、`saveToastTimer` 變數與其 `watch`、`closeSaveToast()` 函式、template 裡 `Teleport(to="body")` 包住的整段 toast 樣板（`.saveToast` 區塊）、`<style>` 裡的 `.saveToast` 整段 CSS，以及不再需要的 `IconClose` import
- [x] 5.2 落地設計決策「決策 5（採用）：用 dirty 狀態追蹤表單，取代 toast」：新增 `dirty` boolean ref（預設 `true`），`watch(profile, () => { dirty.value = true }, { deep: true })`，「儲存設定」按鈕的 `disabled` 綁 `!dirty`
- [x] 5.3 落地設計決策「決策 6（採用）：存檔成功後靠 nextTick 排在 store 的 profile 替換之後，才把 dirty 設回 false」：`onSave()` 改成 `await store.save()` 後 `await nextTick()`，再 `dirty.value = false`
- [x] 5.4 落地設計決策「決策 7（採用）：「取消」按鈕（`store.load(true)`）之後也重置 dirty」：新增一個處理「取消」點擊的函式（取代原本直接綁 `@click="store.load(true)"`），內容為 `await store.load(true)` → `await nextTick()` → `dirty.value = false`
- [x] 5.5 移除 `src/lang/zh-Hant.ts`／`src/lang/en.ts` 裡不再使用的 `brandSettings.saveToast` 整組 key（title／message 兩層巢狀都要刪）
- [x] 5.6 對齊 Requirement「儲存設定成功後，按鈕維持停用直到表單被修改」：確認四個 Scenario（存檔成功變停用、修改表單恢復可點擊、存檔失敗維持可點擊、取消後變停用）在實作中都成立

## 6. 驗證

- [x] 6.1 瀏覽器手動驗證：登入後進入 `/settings`，編輯任一欄位並存檔成功，確認「儲存設定」按鈕立即變成停用樣式；接著修改任一欄位（含切換到別的分頁修改），確認按鈕立即恢復可點擊；點擊「取消」後確認按鈕變回停用；全程確認畫面上不再出現任何 toast
- [x] 6.2 `npm run lint` 通過
- [x] 6.3 `npx vue-tsc --noEmit` 通過
- [x] 6.4 `npx vitest run src/api/real.spec.ts src/stores/stores.spec.ts` 維持全過（確認這次改動沒有動到 API／store 層邏輯）
- [x] 6.5 執行 `spectra validate fix-brand-settings-save-toast --strict` 與 `spectra analyze fix-brand-settings-save-toast`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 6.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-brand-settings-save-toast`
