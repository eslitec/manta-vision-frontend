## Problem

使用者實測編輯器發現兩件事：

1. 「從圖庫選擇 → 裁切 → 另存為新素材」時，對話框跳出「無法讀取原圖…跨網域設定擋下讀取」的錯誤橫幅，DevTools 裡從頭到尾沒有任何 `POST /upload`——裁切產物根本沒送到後端。另存成功的素材名稱也只是檔名（`xxx.png`），不是使用者在對話框輸入的名稱
2. 「加入物件」工具下，畫布上方的按鈕仍寫「從圖庫選擇」，使用者以為選了圖庫的圖會當成物件疊到畫布上；實際行為是把整張底圖換掉（規格「加入物件為文字描述生成，非從圖庫疊圖」明定加入物件是文字描述生成，9/1 對齊 Figma 時刻意移除了圖庫疊圖）

## Root Cause

1. `src/components/ImageEditorWorkspace.vue` 的 `buildCroppedFile()` 用 `new Image()` 加 `crossOrigin = 'anonymous'` 重新載入原圖。但畫面上顯示原圖的 `<img>`（主畫布 `img.editorSourceImg`、選圖彈窗 `ImagePickerDialog.vue` 的縮圖）都沒有 `crossorigin` 屬性，瀏覽器先用**不帶 `Origin`** 的請求載過一次；R2 對不帶 `Origin` 的請求不回 `Access-Control-Allow-Origin` 也不回 `Vary: Origin`（已用 curl 對真後端回的 R2 網址實測），這份沒有 CORS 標頭的回應被放進 HTTP 快取。之後 `crossOrigin` 的 `Image` 發 CORS 請求時瀏覽器直接重用這份快取，CORS 檢查失敗，`img.onerror` 觸發 → `CROP_IMAGE_LOAD_FAILED`。`src/utils/download.ts` 的 `downloadFile()` 早就為同一個原因用 `cache: 'no-store'` 繞過快取，這裡沒有比照
2. `src/api/real.ts` 的 `uploadImage()` 只送 `file`／`folderId`／`sourceImageId`，沒送後端 `POST /upload` 已開放的 `imageName` 欄位（≤100 字元），後端於是用檔名當素材名
3. 畫布上方的按鈕文案是固定的 `common.selectFromLibrary`，不隨工具改變；在「加入物件」工具下這個文案會誤導

## Proposed Solution

1. `buildCroppedFile()` 改成先 `fetch(url, { mode: 'cors', cache: 'reload' })` 取得 Blob，再用 `URL.createObjectURL()` 的同源網址餵給 `Image`（不需要 `crossOrigin`，canvas 也不會被污染），用完 `revokeObjectURL()`；失敗分類維持既有的 `CROP_NO_SOURCE_IMAGE`／`CROP_IMAGE_LOAD_FAILED`／`CROP_EXPORT_BLOCKED` 錯誤碼與文案不變
2. `uploadImage()`（`src/api/real.ts`／`src/api/mock.ts`）與 `src/composables/useAssets.ts` 的 `upload()` 多接一個選填的 `imageName`，`real.ts` 有值時放進 multipart 表單；`saveAsNewAsset()` 把對話框輸入的名稱傳進去。mock 版有 `imageName` 時用它當素材名，沒有維持用檔名
3. 畫布上方按鈕在 `tool === 'object'` 時顯示新文案「更換底圖」（`editor.replaceBaseImage`，`src/lang/zh-Hant.ts`／`src/lang/en.ts` 兩語系同步），行為不變（仍是換底圖）。這是止血：讓文案說出真實行為，不新增從圖庫疊圖的功能

## Non-Goals

- 不替 `<img>` 加 `crossorigin` 屬性來根治快取問題——那會讓沒有 CORS 設定的圖片來源（demo／未來其他 CDN）連顯示都失敗，風險大於收益；`fetch` 跳過快取的做法與 `downloadFile()` 一致
- 不做「加入物件」從圖庫疊圖的功能（規格明定加入物件是文字描述生成）
- 不改「背景移除／加入物件／文字」三個工具的另存邏輯（仍走 mock 的 `saveEdited()`）
- 不動後端

## Success Criteria

- 真後端：從圖庫選一張 R2 上的素材 → 裁切 → 另存為新素材，`POST /api/upload` 回 201、對話框關閉、圖庫查得到新素材，`imageName` 等於對話框輸入的名稱，圖片尺寸等於裁切輸出
- 「加入物件」工具下畫布上方按鈕文字為「更換底圖」，其他工具維持「從圖庫選擇」
- `npx vitest run` 全過（`real.spec.ts` 新增「`uploadImage` 帶 `imageName` 會出現在表單裡」）、`npx vue-tsc --noEmit`、`npm run lint` 通過；兩語系 key 結構一致

## Impact

- Affected specs: `image-editor-ui`（MODIFIED：「非破壞編輯，原圖真的載入畫布，另存為新素材真的存到後端」補上跨網域快取的處理與素材名稱；「加入物件為文字描述生成，非從圖庫疊圖」補上按鈕文案）
- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue（`buildCroppedFile()` 改用 fetch → blob → object URL；`saveAsNewAsset()` 傳 `imageName`；畫布上方按鈕文案依工具切換）
  - Modified: src/api/real.ts（`uploadImage()` 新增 `imageName`）
  - Modified: src/api/mock.ts（`uploadImage()` 同步支援 `imageName`）
  - Modified: src/composables/useAssets.ts（`upload()` 轉發 `imageName`）
  - Modified: src/api/real.spec.ts（新增 `imageName` 表單測試）
  - Modified: src/lang/zh-Hant.ts（新增 `editor.replaceBaseImage`）
  - Modified: src/lang/en.ts（同上）
