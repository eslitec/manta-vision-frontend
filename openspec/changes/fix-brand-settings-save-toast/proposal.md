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

> **修訂（ingest，2026-09-04）**：第一版做法（右下角 toast）已經實作、瀏覽器實測通過、commit 完成。使用者後續決定改用不同的互動方式，**toast 整個拿掉**，改成「存檔成功後『儲存設定』按鈕維持停用，直到使用者再次修改表單內容才恢復可點擊」——用按鈕本身的狀態當作「目前表單內容跟已存檔的狀態一致」的視覺回饋，不再另外彈提示。以下描述最終定案的行為；toast 版本的實作歷史保留在 tasks.md 供追溯。

在 `BrandSettingsView.vue` 內追蹤表單是否為「未存檔的變更」（dirty）狀態：

- 每次成功存檔（`store.save()` resolve 後）後，「儲存設定」按鈕進入停用狀態——此時表單內容跟後端已存的內容一致，沒有東西可以再存
- 使用者只要修改表單中任何欄位（品牌基本資料、視覺識別、文案風格、合規與授權四個分頁的任一欄位），按鈕立即恢復可點擊
- 頁面剛載入、尚未存檔過的初始狀態，按鈕維持可點擊（不受這個機制影響）
- 存檔失敗時按鈕維持可點擊（沿用既有失敗處理路徑，讓使用者可以直接重試）
- **不使用 toast**：先前實作的獨立 toast（右下角卡片、`GenerationToast.vue` 對齊樣式、6 秒自動消失、手動關閉）整段移除，包含對應的 template、樣式與 `brandSettings.saveToast.*` i18n key
- 「取消」按鈕（`store.load(true)`，捨棄本地編輯還原成後端最新內容）之後，表單內容重新對齊後端，按鈕也回到停用狀態——邏輯跟存檔成功後一致：目前顯示的內容等於後端已存的內容，沒有東西可以再存

## Capabilities

### Modified Capabilities

- `brand-settings-ui`：新增一個 Requirement，描述「儲存設定成功後，SHALL 讓『儲存設定』按鈕維持停用直到表單被修改」，取代目前隱含在既有 Requirement 之外、幾乎不可見的行內文字提示（第一版 toast 做法已撤銷，見上方修訂說明）

## Impact

- Affected specs: brand-settings-ui
- Affected code:
  - Modified: src/views/BrandSettingsView.vue（移除獨立 toast 的樣板／狀態／樣式；新增表單 dirty 狀態追蹤與「儲存設定」按鈕的停用邏輯）
  - Modified: src/lang/zh-Hant.ts（移除不再使用的 `brandSettings.saveToast.*` key）
  - Modified: src/lang/en.ts（同上，兩邊 key 結構需一致）
