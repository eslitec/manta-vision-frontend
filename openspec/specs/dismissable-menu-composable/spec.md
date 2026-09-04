# dismissable-menu-composable Specification

## Purpose

定義「點外面或按 Escape 關閉」的下拉選單事件綁定慣例：這類互動 SHALL 透過共用的 `useDismissableMenu` composable 實作，避免個別元件各自手寫 pointerdown／keydown 的判斷邏輯與 document 監聽的綁定/清理樣板。適用於任何輕量、非全螢幕 modal 的下拉選單或彈出面板；全螢幕 modal 的 focus trap（鎖 body 捲動、Tab 循環焦點）由 `useAccessibleDialog` 另外處理，不在此規範範圍內。

## Requirements

### Requirement: 點外面或按 Escape 關閉的下拉選單 SHALL 透過共用的 useDismissableMenu composable

任何需要「選單開啟時，點擊選單容器以外的地方或按下 Escape 鍵即關閉選單」這種互動的程式碼，SHALL 透過共用的 `useDismissableMenu` composable 綁定與清理 document 層級的事件監聽，SHALL NOT 在個別元件內各自手寫 pointerdown／keydown 的判斷邏輯與監聽註冊/清理程式碼。

#### Scenario: 點擊選單容器以外的地方會關閉選單

- **WHEN** 選單處於開啟狀態，使用者點擊選單容器範圍以外的任何地方
- **THEN** `useDismissableMenu` SHALL 把對應的 open 狀態設為 false

##### Example: 點擊字型選單以外的區域

- **GIVEN** ImageEditorWorkspace 的字型選單目前是開啟狀態（fontMenuOpen 為 true）
- **WHEN** 使用者點擊字型選單容器（fontSelectEl）範圍以外的任何 DOM 節點
- **THEN** fontMenuOpen SHALL 被設為 false

#### Scenario: 點擊選單容器內部不會關閉選單

- **WHEN** 選單處於開啟狀態，使用者點擊的目標落在選單容器範圍內
- **THEN** `useDismissableMenu` SHALL 不改變 open 狀態

##### Example: 點擊產業別選單內的選項

- **GIVEN** BrandSettingsView 的產業別選單目前是開啟狀態（industryMenuOpen 為 true）
- **WHEN** 使用者點擊的目標是產業別選單容器（industrySelectEl）內部的一個選項按鈕
- **THEN** industryMenuOpen SHALL 維持 true（不因為這次 pointerdown 而被關閉）

#### Scenario: 按下 Escape 鍵關閉開啟中的選單

- **WHEN** 選單處於開啟狀態，使用者按下 Escape 鍵
- **THEN** `useDismissableMenu` SHALL 把對應的 open 狀態設為 false

#### Scenario: 選單未開啟時不處理任何事件

- **WHEN** 選單處於關閉狀態，使用者點擊頁面任何地方或按下任意鍵（包含 Escape）
- **THEN** `useDismissableMenu` SHALL 不改變 open 狀態（維持 false）

<!-- @trace
source: extract-dismissable-menu-composable, fix-usage-daterange-panel
updated: 2026-09-03
code:
  - src/composables/useDismissableMenu.ts
  - src/views/BrandSettingsView.vue
  - src/components/ImageEditorWorkspace.vue
  - src/views/UsageView.vue
-->