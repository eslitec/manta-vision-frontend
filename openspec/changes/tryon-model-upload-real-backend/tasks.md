## 1. 上傳走真後端

- [x] 1.1 對齊 Requirement「上傳模特照真的上傳到後端」：`src/views/TryOnView.vue` 的 `onModelUpload` 改為 `async`，改呼叫既有 `useAssets().upload(file)`（＝ `api.uploadImage`，真後端 multipart `POST /upload`，不帶 `source`／`folderId`），回傳 `Asset` 的 `id`／`name`／`url` 寫入 `uploadedModels`（`UploadedModel` 型別新增 `url?: string`），`status: 'available'`／`noteKey: 'consented'` 與「未同意就開肖像同意視窗」順序維持不變；驗證：真後端模式（:5173）上傳一張 jpg，清單新增一列且圖庫「上傳」來源多一筆、該列 id 與後端 imageId 相同
- [x] 1.2 對齊 Requirement「上傳模特照真的上傳到後端」的縮圖行為：`.uprow__thumb` 內有 `url` 時顯示 `img.uprow__thumbImage`（`width/height: 100%`、`object-fit: cover`，比照 `.model__thumbImage`），沒有 `url` 才顯示 `IconImagePlaceholder`；驗證：真後端模式縮圖為 R2 圖片、mock 模式（`VITE_USE_MOCK`）仍為佔位圖示
- [x] 1.3 對齊 Requirement「上傳模特照真的上傳到後端」的上傳中停用：新增 `uploading` ref，`onModelUpload` 開頭 `if (uploading.value) return`、`try/finally` 復原；`input.mdrop__input` 加 `:disabled="uploading"`，`label.mdrop` 加 `:class="{ isDisabled: uploading }"` 與對應 `cursor: default; opacity: 0.6` 樣式；驗證：上傳期間 input 為 `disabled`，回應後恢復
- [x] 1.4 對齊 Requirement「上傳模特照真的上傳到後端」的錯誤顯示：`catch` 以 `isFileTooLarge`／`isUnsupportedFormat`（`src/utils/error.ts`）對應 `errors.fileTooLarge`／`errors.unsupportedFormat`，其餘 `errors.submitFailed`，寫入既有 `errorMsg`（sticky footer `p.err(role="alert")`），開始上傳時清空；驗證：mock 模式上傳 11MB 檔與 .gif 檔各一次，footer 依序出現「檔案超過 10MB 上限」「不支援的檔案格式」且清單不新增

## 2. 驗證

- [x] 2.1 `npx vitest run` 0 failed、`npx vue-tsc --noEmit` 與 `npm run lint` exit 0、`npx prettier --check src/views/TryOnView.vue` 通過；i18n 兩語系 key 集合與改動前相同（本次零新增 key）
- [x] 2.2 執行 `spectra validate tryon-model-upload-real-backend` 與 `spectra analyze tryon-model-upload-real-backend`，確認 valid 且 Coverage／Consistency／Gaps 無發現
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive tryon-model-upload-real-backend`
