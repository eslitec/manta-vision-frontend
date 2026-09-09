## 1. 選中的素材真的載入畫布

- [x] 1.1 對齊 Requirement「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」（commit `3b417d5`）：`ImageEditorWorkspace.vue` 新增 `selectedAssetUrl`（來源 `Asset.url`），`selectEditorAsset` 選中時一併寫入；主畫布、修圖來源縮圖、修圖比對面板「原圖」三處改成有 `url` 顯示 `<img object-fit: cover>`、沒有 `url` 才退回 `IconImagePlaceholder`

## 2. 裁切另存真的上傳到真後端

- [x] 2.1 對齊 Requirement「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」（commit `435d598`）：`src/api/real.ts`／`src/api/mock.ts` 的 `uploadImage()` 新增 `sourceImageId` 參數；`real.ts` 帶入 `sourceImageId` 時一併送進 multipart 表單；`mock.ts` 收到時比照真後端標成 `source: 'edit'`，並用 `URL.createObjectURL(file)` 讓假資料模式下縮圖也看得到真的裁切結果
- [x] 2.2 `src/composables/useAssets.ts` 的 `upload()` 轉發 `sourceImageId` 參數
- [x] 2.3 `ImageEditorWorkspace.vue` 新增 `buildCroppedFile()`：用 canvas 把目前裁切範圍（換算過 `object-fit: cover` 顯示邏輯）從原圖畫成真正的圖檔；`saveAsNewAsset()` 在「裁切工具 + 已載入真實素材（有 `url`）」時改叫真的上傳 API（帶 `sourceImageId`），其餘情況（背景移除／加入物件／文字工具，或 demo 素材）維持原本 `saveEdited()`（mock）不變

## 3. 另存失敗顯示看得到的錯誤

- [x] 3.1 對齊 Requirement「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」（commit `12e24f4`）：`SaveAssetDialog.vue` 新增 `error` prop，有值時在按鈕列上方顯示紅色錯誤橫幅（`role="alert"`）
- [x] 3.2 `ImageEditorWorkspace.vue` 的 `buildCroppedFile()` 兩個失敗點換成 `CROP_NO_SOURCE_IMAGE`／`CROP_IMAGE_LOAD_FAILED`／`CROP_EXPORT_BLOCKED` 錯誤碼；新增 `classifySaveError()` 把錯誤碼換成使用者看得懂的訊息，`saveAsNewAsset()` 的 `catch` 分類後設進 `saveErrorMessage`，並在原本所有重置 `saveError` 的地方一併清空
- [x] 3.3 `src/lang/zh-Hant.ts`／`en.ts` 新增 `editor.saveDialog.errorNoSourceImage`／`errorImageAccess`／`errorGeneric`，兩語系同步

## 4. 驗證

- [x] 4.1 `npx vue-tsc --noEmit` 及全部既有單元測試（`mock.spec.ts`／`real.spec.ts`／`useAssets.spec.ts`）皆通過（commit 訊息記錄 155 筆全過）
- [x] 4.2 瀏覽器手動驗證：從圖庫選擇一張有實際檔案的素材進編輯器，確認畫布與縮圖顯示真實圖片；用裁切工具另存為新素材後，開啟「從圖庫選擇」確認找得到新產物；刻意觸發跨網域讀取失敗（或檢查程式碼路徑），確認顯示看得到的紅色錯誤橫幅
- [x] 4.3 執行 `spectra validate fix-editor-crop-save-real-backend --strict` 與 `spectra analyze fix-editor-crop-save-real-backend`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 4.4 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-editor-crop-save-real-backend`
