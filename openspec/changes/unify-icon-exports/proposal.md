## Why

`src/components/icons/` 底下 34 個 icon 元件目前分散給 20 個消費端檔案各自用逐行 default import 引用，用到多個 icon 的檔案要寫多行幾乎相同的匯入敘述，而且沒有任何單一位置能確認目前有哪些 icon 可用。統一成具名 barrel 匯入後每個消費端檔案只需要一行 import，新增 icon 時也只需要在 barrel 補一行，不影響既有消費端寫法的結構。

## What Changes

- 在 src/components/icons/index.ts 新增手寫的具名 re-export barrel，涵蓋現有 34 個 icon 元件，每個 icon 一行 re-export。
- 把 20 個消費端檔案裡逐行 default import 個別 icon 元件的寫法，改成從 src/components/icons 具名匯入。
- barrel 內容手寫維護，不引入 `import.meta.glob` 或程式碼產生工具；新增 icon 忘記補 re-export 時，靠 TypeScript 編譯錯誤擋下，不另外撰寫 lint 規則或驗證腳本。

## Non-Goals

- 不重新命名任何既有 icon 元件、不搬移 icon 檔案位置，只新增 barrel 檔案本身。
- 不引入 `import.meta.glob` 或任何自動產生 barrel 內容的工具。
- 不新增 lint 規則或建置期腳本檢查 barrel 內容與 icon 目錄是否同步。
- 不擴大到 icon 以外的其他元件目錄，範圍僅限 src/components/icons/。

## Capabilities

### New Capabilities

- `icon-component-exports`: 定義 src/components/icons/ 底下 icon 元件的匯出與匯入慣例——透過 barrel 具名匯出，消費端一律用具名 import 取代逐檔案 default import。

### Modified Capabilities

(none)

## Impact

- Affected specs: icon-component-exports（新增）
- Affected code:
  - New: src/components/icons/index.ts
  - Modified: src/components/AppCheckbox.vue, src/components/AppSearchbar.vue, src/components/AssetCard.vue, src/components/ConfirmGenerateDialog.vue, src/components/FeedBadge.vue, src/components/FolderRow.vue, src/components/GenerationToast.vue, src/components/ImageEditorWorkspace.vue, src/components/ImagePickerDialog.vue, src/components/SaveAssetDialog.vue, src/components/TaskCenterPanel.vue, src/layouts/DefaultLayout.vue, src/views/BrandSettingsView.vue, src/views/GenerateImageView.vue, src/views/GenerateVideoView.vue, src/views/HomeView.vue, src/views/LibraryView.vue, src/views/MarketingPostView.vue, src/views/TryOnView.vue, src/views/UsageView.vue
  - Removed: (none)
