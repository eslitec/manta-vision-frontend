## 1. 建立 composable

- [x] 1.1 落地設計決策「決策 1：useDismissableMenu 不回傳新的 ref，只接受呼叫端既有的 open 與 containerRef」與「決策 2：composable 內部行為與現有兩處 handler 逐行對應」：在 src/composables/useDismissableMenu.ts 實作 useDismissableMenu(open, containerRef)，內部註冊 document 的 pointerdown／keydown 監聽並在 onBeforeUnmount 清理；驗證方式：對照 design.md 的 Implementation Contract 逐行核對 pointerdown／keydown 判斷邏輯與現有 4 個 handler（onFontMenuPointerDown、onFontMenuKeydown、onIndustryPointerDown、onIndustryKeydown）一致

## 2. 遷移兩個既有選單

- [x] 2.1 對齊 Requirement「點外面或按 Escape 關閉的下拉選單 SHALL 透過共用的 useDismissableMenu composable」：ImageEditorWorkspace.vue 的字型選單改呼叫 `useDismissableMenu(fontMenuOpen, fontSelectEl)`，移除 onFontMenuPointerDown、onFontMenuKeydown 與對應的 document 監聽註冊/清理程式碼；驗證方式：`grep -n "onFontMenuPointerDown\|onFontMenuKeydown" src/components/ImageEditorWorkspace.vue` 結果為空
- [x] 2.2 對齊 Requirement「點外面或按 Escape 關閉的下拉選單 SHALL 透過共用的 useDismissableMenu composable」：BrandSettingsView.vue 的產業別選單改呼叫 `useDismissableMenu(industryMenuOpen, industrySelectEl)`，移除 onIndustryPointerDown、onIndustryKeydown 與對應的 document 監聽註冊/清理程式碼，toggleIndustryMenu 維持不動；驗證方式：`grep -n "onIndustryPointerDown\|onIndustryKeydown" src/views/BrandSettingsView.vue` 結果為空

## 3. 驗證

- [x] 3.1 全面驗證 Implementation Contract 的驗收標準：執行 `npm run build` 與 `npm run lint` 皆通過；手動在編輯器裡打開字型選單確認點外面關閉、按 Escape 關閉；手動在品牌設定頁打開產業別選單確認點外面關閉、按 Escape 關閉、且開啟時搜尋框仍自動 focus（toggleIndustryMenu 行為不變）
