## 1. 裁切另存跨網域快取修正

- [x] 1.1 對齊 Requirement「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」：`src/components/ImageEditorWorkspace.vue` 的 `buildCroppedFile()` 改成 `fetch(url, { mode: 'cors', cache: 'reload' })` → Blob → `URL.createObjectURL()` 餵給 `Image`（不設 `crossOrigin`），用完 `revokeObjectURL()`；失敗維持 `CROP_IMAGE_LOAD_FAILED`／`CROP_EXPORT_BLOCKED` 分類。驗證：真後端重現腳本改前「無 `POST /api/upload`、對話框出現無法讀取原圖」、改後「`POST /api/upload` 201、對話框關閉」

## 2. 另存帶 imageName

- [x] 2.1 對齊 Requirement「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」：`src/api/real.ts`／`src/api/mock.ts` 的 `uploadImage()` 與 `src/composables/useAssets.ts` 的 `upload()` 新增選填 `imageName`；`real.ts` 有值時放進 multipart 表單，`mock.ts` 有值時用它當素材名；`saveAsNewAsset()` 傳入對話框輸入的名稱。驗證：`src/api/real.spec.ts` 新增「`uploadImage` 帶 `imageName` 會出現在表單裡」測試通過；真後端圖庫查到的 `imageName` 等於對話框輸入

## 3. 加入物件工具按鈕文案止血

- [x] 3.1 對齊 Requirement「加入物件為文字描述生成，非從圖庫疊圖」：`ImageEditorWorkspace.vue` 畫布上方 `canvasHead__libraryButton` 在 `tool === 'object'` 時顯示 `editor.replaceBaseImage`（「更換底圖」／"Replace base image"），其他工具維持 `common.selectFromLibrary`；`src/lang/zh-Hant.ts`／`src/lang/en.ts` 同步新增 key。驗證：真後端重現腳本在加入物件工具下讀到按鈕文字「更換底圖」；i18n 兩語系 key 差異與基準相同

## 4. 驗證

- [x] 4.1 `npx vitest run` 全過（基準 213 筆＋新增測試）、`npx vue-tsc --noEmit` 與 `npm run lint` 結束碼 0、`npx prettier --check` 改動檔通過
- [x] 4.2 `spectra validate fix-editor-crop-cors` 與 `spectra analyze fix-editor-crop-cors` 無 Coverage／Consistency／Gaps 發現
