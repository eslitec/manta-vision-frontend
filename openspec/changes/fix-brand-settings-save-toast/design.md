## Context

`BrandSettingsView.vue` 的存檔成功回饋目前是頁尾一個 12px 綠色行內文字（`saved` ref 控制、`v-if` 直接切換、2 秒後消失），文案還借用了語意不符的 `common.saved`（「已存入」，原本給「生成結果存入圖庫」情境用）。已經用瀏覽器實測確認 `PUT /brand` 有正確回 200 且資料確實存進後端，問題純粹出在回饋不夠明顯，不是功能壞掉（見 proposal.md Root Cause）。

專案裡已經有一個外觀成熟的 toast 樣式可以參考：`src/components/GenerationToast.vue`（畫面右上角固定、圖示＋標題＋訊息、自動消失＋可手動關閉）。但那支元件的內容、「查看」按鈕（固定跳轉 `/library`）、關閉方法都綁在 `generationTasks` store 的語意上，不是通用元件；`generationTasks` 的 toast 是透過 `DefaultLayout.vue` 全域掛載的單例，且在所有頁面（含 `/settings`）都可能被觸發（例如使用者在設定頁時，背景的圖生影片任務剛好完成）。

## Goals / Non-Goals

**Goals:**

- 品牌設定頁存檔成功後，提供視覺上明顯、不容易被忽略的完成提示
- 提示的外觀與互動比照 `GenerationToast.vue`（卡片樣式、圖示＋文字、陰影、自動消失、可手動關閉），維持全站視覺語言一致
- 修正目前誤用的 i18n 文案，改用語意正確、專屬品牌設定情境的文字

**Non-Goals:**

- 不把 `GenerationToast.vue` 改成通用共用元件——那需要同時改動 `generationTasks` store 與 `DefaultLayout.vue` 的既有掛載方式，屬於更大範圍的重構，這次不做
- 不處理存檔失敗路徑的回饋——目前失敗時的既有錯誤處理方式維持不變，這次只補「成功」的回饋
- 不新增或調整品牌設定頁其他既有 Requirement（分段呈現、Logo／色票、文案風格、合規與授權），範圍僅限存檔成功的視覺回饋

## Decisions

### 決策 1：BrandSettingsView 自己刻一個外觀對齊的獨立 toast，不重用 GenerationToast.vue 元件本身

`GenerationToast.vue` 的 `toast` 內容、關閉方法（`tasksStore.dismissToast()`）都來自 `generationTasks` store，「查看」按鈕固定跳轉 `/library`——這些語意跟「品牌設定存檔成功」完全不同。直接重用會需要先把它抽成通用元件（拆出 props/emit、改動 `generationTasks` 既有呼叫方式與 `DefaultLayout.vue` 的掛載邏輯），改動範圍與風險都超出這次要修的問題。改為在 `BrandSettingsView.vue` 內新增一個獨立、僅供這個頁面使用的 toast，樣板結構與樣式參考 `GenerationToast.vue`（`Teleport(to="body")`、卡片樣式、`IconCheckCircle` 圖示、標題＋訊息、自動消失計時器、關閉按鈕），但狀態與觸發邏輯完全獨立，不碰 `generationTasks` store。

若之後有第三個頁面也需要同樣的成功提示，才值得回頭評估抽成共用元件；只有一個使用場景時抽象反而增加不必要的間接層。

### 決策 2：新 toast 固定在畫面右下角，不用右上角

`GenerationToast.vue` 已經佔用畫面右上角（`position: fixed; top: 0; right: 0; z-index: 1200`），而且它是透過 `DefaultLayout.vue` 全域掛載的單例，在包含 `/settings` 在內的所有頁面都可能彈出（例如使用者在品牌設定頁存檔的同時，背景有圖生影片任務剛好完成）。若新 toast 也放在右上角同一個位置，兩者同時觸發時會視覺重疊。改為固定在畫面**右下角**（`position: fixed; bottom: 0; right: 0`），與既有的生成任務 toast 錯開，兩者同時出現時各自完整可見、不互相遮擋。

### 決策 3：新增專屬 i18n key，不再借用 `common.saved`

`common.saved`（「已存入」）語意是「生成結果存入圖庫」，套用在「品牌設定已儲存」的情境文意不通。新增 `brandSettings.saveToast.title`／`brandSettings.saveToast.message` 兩個新 key（繁中：「已儲存」／「品牌設定已成功更新」；英文對應翻譯），`zh-Hant.ts` 與 `en.ts` 的 key 結構需一致。

### 決策 4：自動消失時間比照 GenerationToast.vue 的 6 秒

`GenerationToast.vue` 用 `setTimeout(..., 6000)` 自動消失。新 toast 沿用同樣的 6 秒，維持全站 toast 停留時間一致的體感，同時比原本的 2 秒更充裕，讓使用者有足夠時間注意到並閱讀完內容。

## Implementation Contract

**行為**：使用者在品牌設定頁（`/settings`）任一分頁編輯欄位後按下「儲存設定」，`store.save()` resolve（即 `PUT /brand` 成功回應）後，畫面右下角浮出一張卡片式 toast：`IconCheckCircle` 圖示＋標題「已儲存」＋訊息「品牌設定已成功更新」，6 秒後自動消失，期間使用者可點擊右上角關閉按鈕手動關閉。原本頁尾那個 12px 綠色行內文字提示（連同其 `saved` ref 與相關 template／樣式）整段移除，不再保留。

**資料形狀**：新 toast 的顯示狀態是 `BrandSettingsView.vue` 內部的 local state（例如一個 `boolean` ref），不寫入 Pinia store、不影響 `BrandProfile` 型別或任何既有的 API 呼叫格式。

**失敗模式**：`store.save()` 拋出例外時（現有錯誤處理路徑，例如驗證錯誤造成 422）不觸發這個新 toast——這次只處理成功路徑，失敗時的既有行為（表單維持、由使用者自行修正後重試）不變。

**驗收標準**：
- 手動驗證：在瀏覽器登入後進入 `/settings`，編輯任一欄位並儲存，right-下角需出現含「已儲存」標題與「品牌設定已成功更新」訊息的 toast 卡片，6 秒後自動消失；點擊關閉按鈕可立即關閉
- `npm run lint` 與 `npx vue-tsc --noEmit` 通過
- 既有 `src/api/real.spec.ts`、`src/stores/stores.spec.ts` 測試維持全過（這次改動不影響 API／store 層）
- 頁尾原本的行內「已存入」文字提示在畫面上不再出現（用瀏覽器實測確認，而非只讀程式碼）

**範圍邊界**：僅限 `BrandSettingsView.vue`（新增 toast 樣板／狀態／樣式，移除舊的行內提示）與 `src/lang/zh-Hant.ts`／`src/lang/en.ts`（新增兩個 i18n key）。不修改 `GenerationToast.vue`、`generationTasks` store、`DefaultLayout.vue`，也不修改 `src/api/real.ts`、`src/stores/brand.ts` 的既有存檔邏輯。

## Risks / Trade-offs

- [風險] 新 toast 與 `GenerationToast.vue` 是兩套獨立實作，樣式（顏色、圓角、陰影、間距）之後如果其中一邊調整，另一邊不會自動跟著變，可能隨時間產生視覺落差 → [緩解] 這次實作時直接沿用 `GenerationToast.vue` 現有的 SCSS 數值（顏色變數、`$boxShadowDark`、圓角、字級），把「视覺一致」當成驗收條件的一部分；如果之後出現第三個使用場景，再評估抽成共用元件
- [風險] 右下角位置目前沒有其他既有 UI 佔用，但無法保證未來不會有其他功能也想用右下角 → [緩解] 這次改動範圍小、限定在品牌設定頁單一使用場景，若未來衝突再另開 change 處理
