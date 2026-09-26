## Context

`src/components/ImagePickerDialog.vue` 是「從圖庫選擇」的共用彈窗，六個使用處：`ImageEditorWorkspace`（asset 模式選底圖、object 模式「加入物件」）、`TryOnView`（選服飾，`excludeSources=['tryonModel']`）、`GenerateImageView`（參考圖）、`MarketingPostView`（商品圖）、`GenerateVideoView`（來源圖）。彈窗開啟時用自己的 `useAssets()` 實例 `load({ pageSize: 100 })`（object 模式加 `source: 'object'`）把清單拉回來，來源篩選（全部／上傳／AI 生成）與搜尋都在前端做；asset 模式不列內建素材。

上傳的既有路徑：`useAssets().upload(file, folderId?, sourceImageId?, imageName?, source?)` → `api.uploadImage`。真後端 `POST /upload`：超過 10MB 回 413 `FILE_TOO_LARGE`、不是 jpg／png／webp 回 415 `UNSUPPORTED_FORMAT`（依檔頭判斷），`source` 只收白名單 `object`／`tryon_model`（前端寫 `tryonModel`）。mock 依副檔名與大小擲出同樣的錯誤碼。錯誤判讀有現成的 `isFileTooLarge`／`isUnsupportedFormat`／`displayMessage`（`src/utils/error.ts`），同時認得 mock 的 `Error(CODE)` 與真後端的 `ApiError`。

## Goals / Non-Goals

**Goals:**

- 六個使用處都能在彈窗內直接上傳圖片、上傳完立刻選到它並交回呼叫端，只改共用元件一處。

**Non-Goals:**

- 多檔上傳、指定資料夾、前端預先檢查大小／格式、改動任何使用處的 view 或圖庫頁的上傳按鈕。

## Decisions

### 1. 上傳入口只寫在 ImagePickerDialog，六個使用處零改動

格線第一格是 `button.pick.pick--upload`，後面才是 `v-for` 的素材；按鈕 `@click` 觸發一個 `hidden` 的 `input[type=file]`。用原生 `button` 所以 Tab 聚焦、Enter／Space 觸發都是瀏覽器內建行為；`aria-label` 帶「上傳圖片（jpg／png／webp，10MB 以內），也可以把檔案拖放到這裡」，比可見文字多交代格式與拖放。拖放掛在 `.picker__modal`（涵蓋格線，放偏一點也不會讓瀏覽器直接開啟檔案）。隱藏的 `input` 放在格線之外，`.picker__grid` 的第一個子元素就是上傳卡片。

上傳中不用 `disabled`，改用 `aria-disabled` 加上處理函式裡的守衛：原生 `disabled` 會讓已聚焦的按鈕失焦，鍵盤使用者按 Enter 上傳後焦點會掉出彈窗的焦點循環。

### 2. 上傳走 useAssets().upload，只有物件模式帶 source=object

`upload(file, undefined, undefined, undefined, mode === 'object' ? 'object' : undefined)`：物件模式的清單就是 `GET /images?source=object`，新圖必須標成 `object` 才會出現在下次開啟的物件清單裡；其他模式是一般上傳（`source=upload`）。不帶 `folderId`，落在「未分類」。上傳中 `uploading` 為真，確認鈕 `:disabled="!count || uploading"`，重複點卡片或再拖放都會被守衛擋下；清單還在 `load()` 中也不接受上傳，避免 `GET /images` 晚一步回來把剛插入的新圖蓋掉。

### 3. 新圖以本地插入置頂，不重打 GET /images

成功後 `assets.value.unshift(asset)`，再依 `multiple` 選取（單選 `[id]`、多選 `push(id)`），與既有 `toggle` 的選取語意相同。`POST /upload` 的回應就是完整的 `Asset`；重打 `GET /images` 多一次往返，而且後端以 `createdAt` 倒序，結果一樣是它在最上面。確認鈕沿用既有 `confirm()`（從 `assets` 依 `selectedIds` 取），所以新圖不需要任何額外處理就能交回呼叫端。

### 4. 篩選或搜尋會藏住新圖時切回「全部」並清空搜尋

清單的顯示條件抽成純函式 `isListedInPicker(asset, { mode, excludeSources, source, keyword })`（`src/utils/imagePicker.ts`），`filtered` 與上傳後的判斷共用同一套規則。上傳後若新圖不在目前條件下，把 `activeSource` 設回 `'all'`、`keyword` 清空；本來就看得到（例如篩選是「上傳」、搜尋是空的）就不動使用者的篩選。

### 5. 格式與大小由 API 層判斷，accept 取自既有常數

`accept` 由 `src/api/mock.ts` 既有的 `SUPPORTED_UPLOAD_FORMATS`（改成 export）組成 `.jpg,.jpeg,.png,.webp`，不另立一份清單。拖放不受 `accept` 限制，錯誤交給 mock／真後端擲出，由 `uploadErrorMessage(e, t)` 轉成文案：`FILE_TOO_LARGE` → `errors.fileTooLarge`、`UNSUPPORTED_FORMAT` → `errors.unsupportedFormat`、其他 → `displayMessage(e, t('errors.submitFailed'))`（與試穿頁上傳模特照一致）。訊息以 `p.picker__error(role="alert")` 顯示在格線上方；重新開啟彈窗或下一次上傳開始時清掉。檔案輸入每次 `change` 後清空 `value`，同一個檔案失敗後可以再選一次。

### 6. mock 一般上傳也回傳 object URL

mock 原本只有「另存為新素材」（帶 `sourceImageId`）才回 `URL.createObjectURL(file)`，一般上傳沒有 `url`。真後端一律回網址；mock 沒有網址時，彈窗裡上傳的圖只剩佔位圖示，編輯器選它當底圖也不會進入編輯狀態（`hasSelectedAsset` 看 `url`）。改成一律回 object URL，假資料模式才測得出六個使用處的完整流程。

## Risks / Trade-offs

- [Risk] 上傳進行中關閉彈窗，回應晚到時仍會插入並選取在（已關閉的）清單裡 → [Mitigation] 重新開啟時 `watch(open)` 會清空選取並重新 `load()`，新圖已在後端，清單一樣看得到；不為這個極端時序另加世代計數。
- [Risk] 清單一次最多拉 100 筆，本地插入後會變 101 筆 → [Mitigation] 只影響這一次開啟的畫面，重新開啟就回到後端分頁的結果。
- [Trade-off] 反向代理（nginx）自己回的 413 不是後端的統一錯誤格式，會落到 `errors.submitFailed`／「伺服器回應異常」而不是「檔案超過 10MB」→ 目前本機 vite proxy 與後端都回統一格式，先不在前端依狀態碼補判斷。
