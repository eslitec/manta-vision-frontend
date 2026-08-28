## Context

兩個檔案各自手寫「點外面或按 Escape 關閉選單」的邏輯：

- src/components/ImageEditorWorkspace.vue 的字型選單：fontMenuOpen（開關狀態）、fontSelectEl（容器 ref）、onFontMenuPointerDown、onFontMenuKeydown，在 document 上註冊 pointerdown／keydown 監聽，onBeforeUnmount 清理。
- src/views/BrandSettingsView.vue 的產業別選單：industryMenuOpen、industrySelectEl、onIndustryPointerDown、onIndustryKeydown，結構與字型選單逐行對應。

兩處的 pointerdown handler 都是「未開啟就不處理、點擊目標在容器內就不處理、否則關閉」；keydown handler 都是「Escape 且已開啟就關閉」。BrandSettingsView 另外有 toggleIndustryMenu 函式，負責開啟選單時清空搜尋關鍵字並 focus 搜尋框——這是產業別選單獨有的行為，字型選單沒有對應邏輯。

## Goals / Non-Goals

**Goals:**

- 抽出 useDismissableMenu(open, containerRef) 處理 document pointerdown／keydown 監聽的綁定與清理樣板。
- 兩個既有選單都改用這個 composable，取代各自手寫的 handler 與監聽註冊/清理程式碼。

**Non-Goals:**

- 不改變 toggleIndustryMenu 的行為（清空關鍵字、focus 搜尋框），維持原樣不動。
- 不新增選單內容的鍵盤上下鍵導覽。
- 不合併進 useAccessibleDialog（那是全螢幕 modal 的 focus trap，量級不同）。

## Decisions

### 決策 1：useDismissableMenu 不回傳新的 ref，只接受呼叫端既有的 open 與 containerRef

`useDismissableMenu(open: Ref<boolean>, containerRef: Ref<HTMLElement | null>): void`。呼叫端傳入自己既有的 `fontMenuOpen`／`fontSelectEl`（或 `industryMenuOpen`／`industrySelectEl`），composable 直接讀寫傳入的 open ref，不建立新的內部狀態、不回傳任何東西。

**替代方案**：讓 composable 回傳一個新的 `{ open, containerRef }` 讓呼叫端解構取代自己的 ref——放棄，因為兩個既有選單的 open 狀態已經跟模板裡的 `:class`、`:aria-expanded`、`@click="fontMenuOpen = !fontMenuOpen"` 等地方綁定，若 composable 回傳新的 ref 還要求呼叫端把所有既有引用都換成 composable 回傳的那個，改動範圍會不必要地擴大到模板裡每一個引用 fontMenuOpen/industryMenuOpen 的地方。直接讀寫傳入的 ref 讓遷移只需要新增一行 composable 呼叫，不用動模板。

### 決策 2：composable 內部行為與現有兩處 handler 逐行對應

`useDismissableMenu` 內部：

```
function onPointerDown(event: PointerEvent) {
  if (!open.value) return
  if (containerRef.value?.contains(event.target as Node)) return
  open.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) open.value = false
}
document.addEventListener('pointerdown', onPointerDown)
document.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
```

這與現有 onFontMenuPointerDown／onFontMenuKeydown／onIndustryPointerDown／onIndustryKeydown 四個函式的邏輯逐行對應，行為零差異。現有程式碼用的事件型別是 MouseEvent（`onFontMenuPointerDown = (event: MouseEvent) => ...`），但監聽的是 `'pointerdown'` 事件；composable 改用更精確的 PointerEvent 型別標注監聽的事件物件，這只是型別標注的修正，不影響任何執行期行為（PointerEvent 是 MouseEvent 的子型別，兩者在這裡實際用到的欄位——event.target——完全相同）。

## Implementation Contract

**行為**：重構前後，字型選單與產業別選單的「點選單容器以外的地方關閉」「按 Escape 關閉」「選單未開啟時不處理任何事件」這三種行為 SHALL 與重構前完全相同。BrandSettingsView 的 toggleIndustryMenu（開啟時清空關鍵字、focus 搜尋框）SHALL 維持不變。

**介面 / 資料形狀**：
- `useDismissableMenu(open: Ref<boolean>, containerRef: Ref<HTMLElement | null>): void`，定義於 src/composables/useDismissableMenu.ts。
- ImageEditorWorkspace.vue：移除 onFontMenuPointerDown、onFontMenuKeydown 兩個函式與對應的 document.addEventListener／onBeforeUnmount 清理程式碼，改成呼叫 `useDismissableMenu(fontMenuOpen, fontSelectEl)`。fontMenuOpen、fontSelectEl 兩個 ref 本身不變，模板裡所有引用它們的地方都不用改。
- BrandSettingsView.vue：移除 onIndustryPointerDown、onIndustryKeydown 兩個函式與對應的 document.addEventListener／onBeforeUnmount 清理程式碼，改成呼叫 `useDismissableMenu(industryMenuOpen, industrySelectEl)`。industryMenuOpen、industrySelectEl、toggleIndustryMenu 都不變。

**失敗模式**：同步、無外部 I/O 的事件綁定邏輯，沒有非同步失敗模式。

**驗收標準**：
- `npm run build`（`vue-tsc --noEmit` + `vite build`）通過。
- `npm run lint` 通過。
- `grep -n "onFontMenuPointerDown\|onFontMenuKeydown" src/components/ImageEditorWorkspace.vue` 結果為空。
- `grep -n "onIndustryPointerDown\|onIndustryKeydown" src/views/BrandSettingsView.vue` 結果為空。
- 手動在編輯器裡打開字型選單，點選單以外的地方確認選單關閉、按 Escape 確認選單關閉。
- 手動在品牌設定頁打開產業別選單，點選單以外的地方確認選單關閉、按 Escape 確認選單關閉、確認開啟時搜尋框仍會自動 focus（toggleIndustryMenu 行為不變）。

**範圍邊界**：僅涵蓋這兩個選單的事件綁定/清理樣板重構；不涉及選單內容本身（字型清單、產業別清單、搜尋過濾）、不涉及 toggleIndustryMenu 的搜尋框 focus 邏輯。

## Risks / Trade-offs

- [風險] 手動驗證選單開關行為屬於人工測試，沒有自動化測試防止未來回歸 → [緩解] 這是本次 Non-Goals 明確排除的範圍（不新增測試框架）；驗收標準改用逐行比對現有邏輯取代，降低人工測試遺漏的風險。
