## Problem

品牌設定頁（`/settings`，`BrandSettingsView.vue`）按下「儲存設定」存檔成功後，使用者感受不到任何明確的完成回饋，體感上像是什麼都沒發生：按鈕從「儲存中」變回「儲存設定」，除此之外沒有其他提示。

## Root Cause

畫面上其實有一個完成提示（`saved` 這個 ref 控制），但視覺權重太低、位置不在使用者視線範圍內，文案也錯了：

- 只在 `saved` 為真的 2 秒內顯示，`v-if` 直接切換顯示／隱藏，沒有淡入淡出轉場
- 樣式只有小號綠字（`font-size: 0.75rem`、`color: #45b85b`），沒有圖示、沒有背景框
- DOM 位置在頁尾 `justify-content: flex-end` 的容器裡，排在「取消」「儲存設定」兩個按鈕**左邊**——使用者按下儲存後視線通常盯著按鈕本身看文字變化，不會往左邊瞄那行 12px 小字，2 秒一過就消失
- 顯示的文案是 `t('common.saved')`，也就是「已存入」——這個 i18n key 原本是給「生成結果存入圖庫」情境用的（對照 `src/lang/zh-Hant.ts` 的 `common.saved`／`common.saveToLibrary`），套用在品牌設定的存檔情境語意不對，不是「設定已儲存」

已經實測確認資料有正確存進後端（`PUT /brand` 回 200，重新整理頁面後改動內容確實還在），純粹是完成回饋的呈現方式不夠明顯。

## Proposed Solution

在 `BrandSettingsView.vue` 內新增一個外觀與互動比照專案既有 `GenerationToast.vue` 樣式（右上角固定位置、圖示＋標題訊息、自動消失、可手動關閉）的獨立 toast，取代目前頁尾那個容易被忽略的行內小字：

- 存檔成功（`store.save()` resolve 後）時顯示 toast，樣式與互動對齊 `GenerationToast.vue`（固定於畫面右上角、`IconCheckCircle` 圖示、標題＋訊息文字、自動消失時間、有手動關閉按鈕）
- 這個 toast **獨立於 `generationTasks` store**，不重用 `GenerationToast.vue` 元件本身——那支元件的內容、「查看」按鈕（固定跳轉 `/library`）、關閉方法都綁死在 `generationTasks` store 的語意上，不是通用元件，直接重用需要先把它抽成通用元件（連帶改動 `generationTasks` 與 `DefaultLayout.vue` 的既有用法），超出這次要修的問題範圍
- 存檔失敗時的既有錯誤處理方式不變，這次只處理「成功」路徑的回饋

## Capabilities

### Modified Capabilities

- `brand-settings-ui`：新增一個 Requirement，描述「儲存設定成功後 SHALL 提供明顯的視覺回饋」，取代目前隱含在既有 Requirement 之外、幾乎不可見的行內文字提示

## Impact

- Affected specs: brand-settings-ui
- Affected code:
  - Modified: src/views/BrandSettingsView.vue（新增獨立 toast 的樣板、狀態與樣式，移除原本頁尾的行內「已儲存」文字）
  - Modified: src/lang/zh-Hant.ts（新增 toast 標題／訊息專用的 i18n key，不再借用語意不符的 `common.saved`）
  - Modified: src/lang/en.ts（同上，兩邊 key 結構需一致）
