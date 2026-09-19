## Why

AI 試穿工作台「上傳模特照」分頁目前只有 UI 殼：選檔後 `onModelUpload` 只把檔名 push 進記憶體清單（id 用 `crypto.randomUUID()`），`File` 物件當場丟棄，沒有任何上傳、沒有縮圖。後端契約（`manta-vision-backend` docs/api/v13.md §17）明訂 `POST /tryon` 的 `modelSource: 'upload'` 要帶「先走 #4 `POST /upload` 拿到的 `imageId`」——現在清單裡的 id 送過去只會 404，所以接試穿之前必須先讓模特照真的上傳到後端、清單記住真正的 `imageId`。

## What Changes

- `src/views/TryOnView.vue` 的 `onModelUpload` 改為 `async`，改呼叫既有的 `useAssets().upload(file)`（＝ `api.uploadImage`：真後端 multipart `POST /upload`，mock 走 `mock.ts` 的 `uploadImage`），不帶 `source`（後端白名單只有 `object`，一般上傳由後端自標 `upload`）、不帶 `folderId`（落未分類）
- 回傳的 `Asset` 進「已上傳模特」清單：`id` ＝後端 `imageId`、`name` ＝後端 `imageName`、新增 `url` 欄位存後端 R2 URL；`status: 'available'`／`noteKey: 'consented'` 維持現行寫法
- 清單縮圖：有 `url` 顯示真實縮圖（`object-fit: cover`，比照內建模特 `.model__thumbImage`），沒有 `url`（mock 模式）才顯示既有的 `IconImagePlaceholder`
- 上傳中停用上傳控制項（`uploading` ref，比照 `ImageEditorWorkspace.vue` 的 `savingAsset` 模式）：`input` 加 `:disabled`、`label.mdrop` 加 `isDisabled` 樣式，完成或失敗後恢復
- 上傳失敗以既有的 `errorMsg`／sticky footer `p.err(role="alert")` 顯示：`isFileTooLarge` → `errors.fileTooLarge`、`isUnsupportedFormat` → `errors.unsupportedFormat`、其餘 → `errors.submitFailed`；三個 key 都已存在，零新增 i18n key
- 「上傳完成後若尚未肖像同意就開同意視窗」的既有順序不變（後端的肖像 gating 在 `POST /tryon`，`POST /upload` 本身不擋）

## Non-Goals

- 不接 `POST /tryon`、不改 `onGenerate`／`saveResult`／`getConsent`／`giveConsent`——後端 #17／#24／#25 尚未實作（docs/api-status.md），這些仍走 mock
- 不做審核狀態邏輯：後端 `WireImage` 沒有審核欄位，真上傳一律 `available`；`UploadedModel` 的 `status`／`reupload` pill 與 `demo-a`／`demo-b` 兩列示範資料維持不動（零成本、mock 畫面不變），接 `POST /tryon` 時再拿掉示範資料（它們的 id 不是 `imageId`）
- 不擋 20 張上限：後端對圖片數量沒有上限，「n / 20」維持純顯示文字，與現行行為一致
- 不從 `GET /images` 回填歷史模特照：後端沒有「模特照」來源值（`source` 只能是 `upload`），用 `source=upload` 撈會把商品圖、Logo 全當成模特照；固定資料夾方案要靠資料夾名稱辨識、太脆。重新整理後清單消失、圖仍在圖庫「上傳」來源，屬已知限制；日後若要找回，走既有 `ImagePickerDialog` 加「從圖庫選擇」較合適
- 不改 `useAssets.ts`、`src/api/real.ts`、`src/api/mock.ts`、i18n 檔與既有 spec（`mock.spec.ts`／`real.spec.ts`／`useAssets.spec.ts` 已覆蓋上傳鏈；本 repo 沒有 view 級測試慣例）
- 不把「上傳列表項目可被選為試穿模特」做進來（uprow 沒有 click／aria-pressed），那屬於接 `POST /tryon` 那一步

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `tryon-ui`：新增「上傳模特照真的上傳到後端」要求——選檔後經既有上傳路徑送到後端，清單記住後端 `imageId` 與縮圖 URL，上傳中停用控制項，失敗顯示對應錯誤文案；mock 模式走同一條路徑

## Impact

- Affected specs: tryon-ui
- Affected code:
  - Modified: src/views/TryOnView.vue（`onModelUpload` 改走 `useAssets().upload`、`UploadedModel` 新增 `url?`、`uploading` ref、縮圖 v-if、錯誤對應、`.mdrop.isDisabled`／`.uprow__thumbImage` 樣式）
  - New: （無）
  - Removed: （無）
