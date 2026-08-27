## 1. 建立 icon barrel

- [x] 1.1 落地設計決策「決策 1：barrel 採手寫具名 re-export，不用 import.meta.glob」：在 src/components/icons/index.ts 為 src/components/icons/ 底下每一個 icon 元件各寫一行 `export { default as <IconName> } from './<IconName>.vue'`；驗證方式：`grep -c "^export"` 該檔案的行數等於 `ls src/components/icons/*.vue | wc -l` 的結果
- [x] 1.2 對齊 Requirement「Icon 元件 SHALL 透過具名 barrel 匯出」：逐一確認 index.ts 裡每一行 re-export 的 `<IconName>` 與對應檔名（去掉 `.vue`）逐字相同；驗證方式：`npm run build`（`vue-tsc --noEmit`）不因匯出名稱打錯或缺漏而報錯

## 2. 遷移消費端元件（src/components/）

- [x] 2.1 對齊 Requirement「消費端程式碼 SHALL 從 barrel 具名匯入 icon」：把 AppCheckbox.vue、AppSearchbar.vue、AssetCard.vue、ConfirmGenerateDialog.vue、FeedBadge.vue 這 5 個檔案裡逐行指向個別 icon `.vue` 檔案路徑的 import 改成單一具名 import 陳述式從 `@/components/icons` 匯入；驗證方式：這 5 個檔案內 `grep "from '@/components/icons/Icon"` 結果為空
- [x] 2.2 對齊 Requirement「消費端程式碼 SHALL 從 barrel 具名匯入 icon」：把 FolderRow.vue、GenerationToast.vue、ImageEditorWorkspace.vue、ImagePickerDialog.vue、SaveAssetDialog.vue、TaskCenterPanel.vue 這 6 個檔案裡逐行指向個別 icon `.vue` 檔案路徑的 import 改成單一具名 import 陳述式從 `@/components/icons` 匯入；驗證方式：這 6 個檔案內 `grep "from '@/components/icons/Icon"` 結果為空

## 3. 遷移消費端頁面與 layout（src/layouts/、src/views/）

- [x] 3.1 對齊 Requirement「消費端程式碼 SHALL 從 barrel 具名匯入 icon」：把 DefaultLayout.vue、BrandSettingsView.vue、GenerateImageView.vue、GenerateVideoView.vue、HomeView.vue 這 5 個檔案裡逐行指向個別 icon `.vue` 檔案路徑的 import 改成單一具名 import 陳述式從 `@/components/icons` 匯入；驗證方式：這 5 個檔案內 `grep "from '@/components/icons/Icon"` 結果為空
- [x] 3.2 落地設計決策「決策 2：一次遷移全部 20 個消費端檔案，不分批留存兩種寫法」：把 LibraryView.vue、MarketingPostView.vue、TryOnView.vue、UsageView.vue 這 4 個檔案裡逐行指向個別 icon `.vue` 檔案路徑的 import 改成單一具名 import 陳述式從 `@/components/icons` 匯入，完成後本次列出的 20 個消費端檔案全數遷移完畢，不留任何一個檔案繼續使用逐檔案 default import；驗證方式：這 4 個檔案內 `grep "from '@/components/icons/Icon"` 結果為空

## 4. 驗證

- [x] 4.1 落地設計決策「決策 3：不加自動化防呆，靠 TypeScript 編譯錯誤擋新增 icon 漏補 barrel」：確認本次不新增任何 lint 規則或建置期腳本比對 barrel 內容與 icon 目錄，僅依賴 `npm run build` 的型別檢查作為防呆；驗證方式：`git diff --stat` 確認變動檔案只有 src/components/icons/index.ts 與 20 個消費端檔案，沒有新增 lint 設定檔或腳本檔案
- [x] 4.2 全面驗證 Implementation Contract 的驗收標準：對 20 個消費端檔案逐一執行 `grep "from '@/components/icons/Icon"` 確認結果全部為空、執行 `npm run build` 與 `npm run lint` 皆通過、確認 src/components/icons/index.ts 的具名匯出行數等於 `src/components/icons/` 底下 icon 元件檔案數量
