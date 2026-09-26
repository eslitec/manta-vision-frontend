## Why

使用者回報：在「AI 試穿／選擇服飾素材」等選圖彈窗裡看得到「上傳」篩選，卻只能挑已經在圖庫的圖——手上的新圖得先離開頁面、到圖庫上傳、再回來重開彈窗。她要求「上傳這邊應該要可以直接加上圖片，共用到這邊的 panel」。

六個畫面（圖庫「編輯圖片」選底圖、編輯器「加入物件」、AI 試穿選服飾、生成圖片選參考圖、行銷 PO 文選圖、生成影片選圖）用的都是同一個 `ImagePickerDialog.vue`，所以只要在這個共用元件補上上傳，六處同時生效。

## What Changes

- 選圖彈窗格線的第一格固定是「上傳圖片」卡片（虛線框＋加號＋文字，沿用既有格子尺寸與色系）：可用滑鼠點、鍵盤 Tab 聚焦後按 Enter／Space 開檔案選擇，有 `aria-label`；也可以把檔案拖放到彈窗內。`accept` 取自既有的支援格式常數（jpg／jpeg／png／webp）。
- 上傳走既有的 `useAssets().upload` → `api.uploadImage`（真後端 `POST /upload`）。物件模式（編輯器「加入物件」）帶 `source=object`，其他模式不帶 `source`（一般上傳）。
- 上傳中：卡片顯示進行中狀態、「選擇這張」／「加入所選」停用、不能重複送出。
- 上傳成功：新圖插到清單最上方並自動選取（單選取代、多選加入）；目前的來源篩選或搜尋字會把它藏起來時，切回「全部」並清空搜尋。按「選擇這張」就交回呼叫端。
- 上傳失敗：檔案太大（`FILE_TOO_LARGE`／413）、格式不支援（`UNSUPPORTED_FORMAT`／415）、其他錯誤，在彈窗內以 `role="alert"` 顯示對應訊息，清單不新增項目，可再試一次。錯誤文案重用既有的 `errors.fileTooLarge`／`errors.unsupportedFormat`／`errors.submitFailed`。
- i18n 兩語系同步新增 `imagePicker.upload`、`imagePicker.uploading`、`imagePicker.uploadLabel`。
- mock 的一般上傳也回傳檔案的 object URL（真後端本來就回網址），讓假資料模式下上傳的圖在彈窗與編輯器裡看得到、用得到。

## Non-Goals (optional)

- 不一次上傳多個檔案（檔案選擇器與拖放都只取第一個檔案）；目前六個使用處都是單選。
- 不改六個使用處的 view（`TryOnView`、`GenerateImageView`、`GenerateVideoView`、`MarketingPostView`、`ImageEditorWorkspace`、`LibraryView`），也不改圖庫頁既有的上傳按鈕。
- 不在前端預先檢查檔案大小／格式，交給既有 API 層（mock 與真後端）判斷。
- 不指定上傳的資料夾，一律落在「未分類」（與後端預設一致）。
- 不呼叫任何扣點端點；上傳不扣飼料。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `library-management-ui`：新增「素材挑選彈窗可直接上傳圖片」「素材挑選彈窗上傳成功後新圖置頂並自動選取」「素材挑選彈窗上傳失敗時顯示錯誤且不新增項目」三條 Requirement。

## Impact

- Affected specs: `library-management-ui`（ADDED 三條 Requirement）
- Affected code:
  - Modified: src/components/ImagePickerDialog.vue（上傳卡片、隱藏的檔案輸入、拖放、上傳中／錯誤狀態、確認鈕停用）
  - New: src/utils/imagePicker.ts、src/utils/imagePicker.spec.ts（`isListedInPicker`、`uploadErrorMessage`）
  - Modified: src/api/mock.ts（匯出 `SUPPORTED_UPLOAD_FORMATS`；一般上傳回傳 object URL）、src/api/mock.spec.ts
  - Modified: src/lang/zh-Hant.ts、src/lang/en.ts
