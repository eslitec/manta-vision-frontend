## Context

> **修訂（ingest，2026-09-04）**：本節以下維持原始內容作為背景記錄。實際定案的做法已改變——見下方「決策 5～7」與 Goals 的修訂說明；決策 1～4 描述的 toast 做法已撤銷。

`BrandSettingsView.vue` 的存檔成功回饋目前是頁尾一個 12px 綠色行內文字（`saved` ref 控制、`v-if` 直接切換、2 秒後消失），文案還借用了語意不符的 `common.saved`（「已存入」，原本給「生成結果存入圖庫」情境用）。已經用瀏覽器實測確認 `PUT /brand` 有正確回 200 且資料確實存進後端，問題純粹出在回饋不夠明顯，不是功能壞掉（見 proposal.md Root Cause）。

專案裡已經有一個外觀成熟的 toast 樣式可以參考：`src/components/GenerationToast.vue`（畫面右上角固定、圖示＋標題＋訊息、自動消失＋可手動關閉）。但那支元件的內容、「查看」按鈕（固定跳轉 `/library`）、關閉方法都綁在 `generationTasks` store 的語意上，不是通用元件；`generationTasks` 的 toast 是透過 `DefaultLayout.vue` 全域掛載的單例，且在所有頁面（含 `/settings`）都可能被觸發（例如使用者在設定頁時，背景的圖生影片任務剛好完成）。

## Goals / Non-Goals

> **修訂（ingest，2026-09-04）**：改用「按鈕停用直到表單被修改」取代 toast，Goals／Non-Goals 更新如下。

**Goals:**

- 品牌設定頁存檔成功後，提供明確的完成回饋——用「儲存設定」按鈕停用（直到表單被修改才恢復）取代原本容易被忽略的行內小字，也取代已撤銷的 toast 版本
- 「取消」（捨棄本地編輯、還原成後端內容）之後，按鈕狀態邏輯與存檔成功後一致：目前顯示內容等於後端已存內容時，按鈕停用

**Non-Goals:**

- ~~提示的外觀比照 `GenerationToast.vue`~~（已撤銷——toast 整個拿掉，不再需要視覺對齊）
- 不把 `GenerationToast.vue` 改成通用共用元件——這件事本來就跟這次改動無關
- 不處理存檔失敗路徑的回饋——目前失敗時的既有錯誤處理方式維持不變（按鈕維持可點擊，讓使用者能直接重試）
- 不新增或調整品牌設定頁其他既有 Requirement（分段呈現、Logo／色票、文案風格、合規與授權），範圍僅限存檔成功後的按鈕停用行為

## Decisions

> **決策 1～4（下方）為第一版 toast 做法，已實作、驗證、commit，後續被使用者撤銷，不再採用。保留於此供追溯；實際採用的是決策 5～7。**

### 決策 1：BrandSettingsView 自己刻一個外觀對齊的獨立 toast，不重用 GenerationToast.vue 元件本身

`GenerationToast.vue` 的 `toast` 內容、關閉方法（`tasksStore.dismissToast()`）都來自 `generationTasks` store，「查看」按鈕固定跳轉 `/library`——這些語意跟「品牌設定存檔成功」完全不同。直接重用會需要先把它抽成通用元件（拆出 props/emit、改動 `generationTasks` 既有呼叫方式與 `DefaultLayout.vue` 的掛載邏輯），改動範圍與風險都超出這次要修的問題。改為在 `BrandSettingsView.vue` 內新增一個獨立、僅供這個頁面使用的 toast，樣板結構與樣式參考 `GenerationToast.vue`（`Teleport(to="body")`、卡片樣式、`IconCheckCircle` 圖示、標題＋訊息、自動消失計時器、關閉按鈕），但狀態與觸發邏輯完全獨立，不碰 `generationTasks` store。

若之後有第三個頁面也需要同樣的成功提示，才值得回頭評估抽成共用元件；只有一個使用場景時抽象反而增加不必要的間接層。

### 決策 2：新 toast 固定在畫面右下角，不用右上角

`GenerationToast.vue` 已經佔用畫面右上角（`position: fixed; top: 0; right: 0; z-index: 1200`），而且它是透過 `DefaultLayout.vue` 全域掛載的單例，在包含 `/settings` 在內的所有頁面都可能彈出（例如使用者在品牌設定頁存檔的同時，背景有圖生影片任務剛好完成）。若新 toast 也放在右上角同一個位置，兩者同時觸發時會視覺重疊。改為固定在畫面**右下角**（`position: fixed; bottom: 0; right: 0`），與既有的生成任務 toast 錯開，兩者同時出現時各自完整可見、不互相遮擋。

### 決策 3：新增專屬 i18n key，不再借用 `common.saved`

`common.saved`（「已存入」）語意是「生成結果存入圖庫」，套用在「品牌設定已儲存」的情境文意不通。新增 `brandSettings.saveToast.title`／`brandSettings.saveToast.message` 兩個新 key（繁中：「已儲存」／「品牌設定已成功更新」；英文對應翻譯），`zh-Hant.ts` 與 `en.ts` 的 key 結構需一致。

### 決策 4：自動消失時間比照 GenerationToast.vue 的 6 秒

`GenerationToast.vue` 用 `setTimeout(..., 6000)` 自動消失。新 toast 沿用同樣的 6 秒，維持全站 toast 停留時間一致的體感，同時比原本的 2 秒更充裕，讓使用者有足夠時間注意到並閱讀完內容。

### 決策 5（採用）：用 dirty 狀態追蹤表單，取代 toast

不再彈任何提示，改成追蹤「表單內容是否偏離目前已存檔的狀態」（dirty）。實作：一個 `dirty` 的 `boolean` ref，預設 `true`（頁面剛載入、還沒存過檔時按鈕本來就該可點擊）；`watch(profile, () => { dirty.value = true }, { deep: true })` 深度監看整個 `profile`，任何欄位被修改（品牌名稱、色票、語氣標籤……不分分頁）都會把 `dirty` 打回 `true`；「儲存設定」按鈕的 `disabled` 綁 `!dirty`。

選 dirty-flag 而不是「跟上次存檔的內容做深度比較」的原因：`profile` 本身就是使用者正在編輯的那份 reactive 物件，沒有另外保留一份「上次存檔快照」，深度比較每次都要整包 diff、成本高又沒必要——只要知道「動過」就夠了，不需要知道動了什麼。

### 決策 6（採用）：存檔成功後靠 nextTick 排在 store 的 profile 替換之後，才把 dirty 設回 false

`stores/brand.ts` 的 `save()` 是 `profile.value = await api.saveBrand(profile.value)`——存檔成功後會用後端回傳的完整物件**整包替換** `profile.value`，這本身也會觸發決策 5 那個深度 watcher（物件參照換了），如果順序沒抓好，`dirty` 會在存檔成功的當下被自動打回 `true`，按鈕永遠停用不了。做法：`onSave()` 裡 `await store.save()` 之後先 `await nextTick()`，確保 watcher 觸發的那次 `dirty = true` 已經跑完，再用 `dirty.value = false` 蓋回去，讓「存檔成功」永遠是最後一個動作、按鈕確實會停用。

### 決策 7（採用）：「取消」按鈕（`store.load(true)`）之後也重置 dirty

`store.load(true)` 會用後端最新內容整包替換 `profile.value`，性質跟存檔成功一樣——都是「目前顯示內容 = 後端已存內容」，所以套用同一套邏輯：`load()` 完成後 `dirty.value = false`。做法跟決策 6 相同（`await store.load(true)` 之後 `await nextTick()` 再設 `dirty.value = false`），避免使用者按了取消、畫面明明跟後端一致，按鈕卻還顯示可點擊的不一致狀態。

## Implementation Contract

**行為**：使用者在品牌設定頁（`/settings`）任一分頁編輯欄位後，「儲存設定」按鈕從停用（若之前是停用狀態）變成可點擊；按下並存檔成功（`store.save()` resolve）後，按鈕立即回到停用狀態，直到使用者再次修改表單任一欄位才恢復可點擊。點擊「取消」（`store.load(true)`）套用同一套邏輯：還原成後端內容後按鈕回到停用狀態。**不使用 toast**——先前實作的獨立 toast（`saveToast` ref、對應 template／樣式、`brandSettings.saveToast.*` i18n key）整段移除。原本頁尾的行內「已存入」文字提示（`saved` ref）已在第一版 toast 實作時移除，維持移除狀態。

**資料形狀**：`dirty` 是 `BrandSettingsView.vue` 內部的 local state（`boolean` ref），不寫入 Pinia store、不影響 `BrandProfile` 型別或任何既有的 API 呼叫格式。

**失敗模式**：`store.save()` 拋出例外時（現有錯誤處理路徑，例如驗證錯誤造成 422）不會執行到 `dirty.value = false` 那一行（因為 `await` 會讓例外中斷 `onSave()` 後續程式碼）——按鈕維持可點擊，讓使用者能直接修正後重試，不需要先動一下表單才能重新觸發存檔。

**驗收標準**：
- 手動驗證：在瀏覽器登入後進入 `/settings`，編輯任一欄位並存檔成功，「儲存設定」按鈕立即變成停用（disabled）樣式；接著修改任一欄位（不限哪個分頁），按鈕立即恢復可點擊；點擊「取消」後按鈕也回到停用狀態
- `npm run lint` 與 `npx vue-tsc --noEmit` 通過
- 既有 `src/api/real.spec.ts`、`src/stores/stores.spec.ts` 測試維持全過（這次改動不影響 API／store 層）
- 畫面上不再出現任何 toast（右下角卡片）——用瀏覽器實測確認，而非只讀程式碼
- `src/views/BrandSettingsView.vue` 不再 import `IconClose`（原本只給 toast 關閉按鈕用），`src/lang/zh-Hant.ts`／`en.ts` 不再有 `brandSettings.saveToast` 這個 key

**範圍邊界**：僅限 `BrandSettingsView.vue`（移除 toast 樣板／狀態／樣式，新增 `dirty` 狀態與按鈕 `disabled` 綁定）與 `src/lang/zh-Hant.ts`／`src/lang/en.ts`（移除 `brandSettings.saveToast.*`）。不修改 `GenerationToast.vue`、`generationTasks` store、`DefaultLayout.vue`，也不修改 `src/api/real.ts`、`src/stores/brand.ts` 的既有存檔邏輯。

## Risks / Trade-offs

- [風險] `watch(profile, ..., { deep: true })` 對大型巢狀物件（色票陣列、hashtags 陣列）每次變動都要做深度追蹤，效能成本比單純的 boolean 切換高 → [緩解] `BrandProfile` 欄位數量與陣列長度都很小（色票最多幾筆、hashtags 上限 8 個），深度 watch 的成本可忽略；不做更複雜的淺層 dirty-tracking 方案
- [風險] 使用者修改欄位後又手動改回原本的值，`dirty` 依然是 `true`（按鈕維持可點擊即使內容其實沒變）→ [緩解] 這是 dirty-flag 方案的已知、可接受的簡化行為（決策 5 的取捨），多按一次「儲存設定」沒有副作用，不值得為了這個邊界情況做深度比較
- [風險] 決策 6／7 都依賴 `nextTick()` 排序來避開 store 替換 `profile.value` 觸發的 watcher，如果之後 `stores/brand.ts` 的 `save()`／`load()` 改成不同的非同步時序（例如中間插入額外的 await），`nextTick()` 排序可能失效 → [緩解] 這次改動不動 `stores/brand.ts`；若之後改了，需要重新檢查這裡的排序假設是否還成立
