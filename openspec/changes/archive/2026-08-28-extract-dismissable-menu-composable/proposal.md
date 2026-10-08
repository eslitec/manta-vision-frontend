## Summary

抽出 useDismissableMenu(open, containerRef) composable，消除「點外面關閉的下拉選單」邏輯在 ImageEditorWorkspace.vue 的字型選單與 BrandSettingsView.vue 的產業別選單裡的重複。

## Motivation

ImageEditorWorkspace.vue 的字型選單（fontMenuOpen、fontSelectEl、onFontMenuPointerDown、onFontMenuKeydown）與 BrandSettingsView.vue 的產業別選單（industryMenuOpen、industrySelectEl、onIndustryPointerDown、onIndustryKeydown）目前各自手寫同一段邏輯：在 document 上註冊 pointerdown 與 keydown 監聽，pointerdown handler 判斷「選單未開啟就不處理」「點擊目標落在容器內就不處理，否則關閉選單」，keydown handler 判斷「按下 Escape 且選單開啟就關閉」，並在 onBeforeUnmount 清理這兩個監聽。兩處程式碼逐行對應，只差變數命名。這種重複讓修一個下拉選單相關的行為（例如點外面關閉的判斷邏輯）容易漏改另一處。

## Proposed Solution

新增 useDismissableMenu(open, containerRef)（放在 src/composables/useDismissableMenu.ts）：接受呼叫端既有的 open（Ref<boolean>）與 containerRef（Ref<HTMLElement | null>），composable 內部：
- 在 setup 階段對 document 註冊 pointerdown 與 keydown 監聽。
- pointerdown handler：若 open.value 為 false 則不處理；若事件目標落在 containerRef.value 範圍內則不處理；否則將 open.value 設為 false。
- keydown handler：若按鍵是 Escape 且 open.value 為 true，將 open.value 設為 false。
- 呼叫 onBeforeUnmount 移除這兩個監聽。

composable 不回傳任何新的 ref，因為 open 與 containerRef 都是呼叫端既有的狀態，composable 只負責監聽的註冊與清理副作用。

ImageEditorWorkspace.vue 的字型選單與 BrandSettingsView.vue 的產業別選單都改成呼叫 useDismissableMenu(對應的 open ref, 對應的 containerRef)，取代各自手寫的 onXxxPointerDown／onXxxKeydown 函式與 document 監聽註冊/清理程式碼。

BrandSettingsView.vue 的 toggleIndustryMenu 函式（開啟選單時自動清空搜尋關鍵字、focus 搜尋框）維持原樣，不併入新 composable——這是產業別選單獨有的行為，字型選單沒有對應邏輯，硬塞進共用 composable 只會讓介面多一個字型選單用不到的選項。

## Non-Goals

- 不改變任何使用者可見行為：選單開關、點外面關閉、Escape 關閉的操作手感都維持原樣。
- 不處理選單內容本身的鍵盤上下鍵導覽（目前字型選單與產業別選單都沒有這個功能，只有點擊選取，不在本次範圍內新增）。
- 不合併進 useAccessibleDialog——那是給全螢幕 modal 用的 focus trap（鎖 body 捲動、app inert、Tab 循環焦點），跟這種輕量下拉選單是不同量級的互動，硬合併會讓 useAccessibleDialog 的介面變複雜。
- 不新增任何測試框架；本次沒有既有的自動化測試涵蓋這兩個選單，驗證方式是手動操作確認點外面關閉與 Escape 關閉的行為不變（見 design.md 的 Implementation Contract）。

## Capabilities

### New Capabilities

- `dismissable-menu-composable`: 定義「點外面或按 Escape 關閉的下拉選單」的內部實作慣例——事件綁定 SHALL 透過共用的 useDismissableMenu composable。

### Modified Capabilities

(none)

## Impact

- Affected specs: dismissable-menu-composable（新增）
- Affected code:
  - New: src/composables/useDismissableMenu.ts
  - Modified: src/components/ImageEditorWorkspace.vue, src/views/BrandSettingsView.vue
  - Removed: (none)
