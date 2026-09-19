## Why

AI 試穿工作台「上傳模特照」分頁目前只有 UI 殼：選檔後 `onModelUpload` 只把檔名 push 進記憶體清單（id 用 `crypto.randomUUID()`），`File` 物件當場丟棄，沒有任何上傳、沒有縮圖。後端契約（`manta-vision-backend` docs/api/v13.md §17）明訂 `POST /tryon` 的 `modelSource: 'upload'` 要帶「先走 #4 `POST /upload` 拿到的 `imageId`」——現在清單裡的 id 送過去只會 404，所以接試穿之前必須先讓模特照真的上傳到後端、清單記住真正的 `imageId`。

## What Changes

- `src/views/TryOnView.vue` 的 `onModelUpload` 改為 `async`，改呼叫既有的 `useAssets().upload(file)`（＝ `api.uploadImage`：真後端 multipart `POST /upload`，mock 走 `mock.ts` 的 `uploadImage`），不帶 `source`（後端白名單只有 `object`，一般上傳由後端自標 `upload`）、不帶 `folderId`（落未分類）
- 回傳的 `Asset` 進「已上傳模特」清單：`id` ＝後端 `imageId`、`name` ＝後端 `imageName`、新增 `url` 欄位存後端 R2 URL；`status: 'available'`／`noteKey: 'consented'` 維持現行寫法
- 清單縮圖：有 `url` 顯示真實縮圖（`object-fit: cover`，比照內建模特 `.model__thumbImage`），沒有 `url`（mock 模式）才顯示既有的 `IconImagePlaceholder`
- 上傳中停用上傳控制項（`uploading` ref，比照 `ImageEditorWorkspace.vue` 的 `savingAsset` 模式）：`input` 加 `:disabled`、`label.mdrop` 加 `isDisabled` 樣式，完成或失敗後恢復
- 上傳失敗以既有的 `errorMsg`／sticky footer `p.err(role="alert")` 顯示：`isFileTooLarge` → `errors.fileTooLarge`、`isUnsupportedFormat` → `errors.unsupportedFormat`、其餘 → `errors.submitFailed`；三個 key 都已存在，零新增 i18n key
- 肖像同意改為**上傳前**檢查（審查意見 2026-09-19）：未同意時檔案不離開瀏覽器，只開同意視窗，同意後重新選檔；改動前 mock 不落地所以「先上傳、後開視窗」無害，改成真上傳後未同意的肖像照會先進 R2／DB，順序必須反過來（後端的 gating 在 `POST /tryon`，`POST /upload` 本身不擋，所以前端要擋）
- 清單「刪除」改為真的刪（審查意見）：非示範列先走既有 `useAssets().deleteAssets([id])`（`DELETE /images/{id}`），成功才移除列，失敗保留列並顯示 `library.batchFailed`；改動前 id 是 `randomUUID()`、後端沒有這筆，「只刪本地」才是對的
- 示範列 `demo-a`／`demo-b` 只在假資料模式顯示（審查意見）：`src/api/index.ts` 匯出 `useRealBackend`，真後端清單初始為空——後端沒有審核欄位，正式環境不該看到「需重傳・審核未過」
- `accept` 收斂為 `image/jpeg,image/png,image/webp`、`tryOn.upload.hint` 改 JPG／PNG／WebP（兩語系同步改既有值，零新增 key）；縮圖 `@error` 退回佔位圖示（比照 `AssetCard`）；上傳中 `label` 加 `aria-busy`、圖示換 `IconLoader.spin`（比照生成按鈕）

## Non-Goals

- 不接 `POST /tryon`、不改 `onGenerate`／`saveResult`／`getConsent`／`giveConsent`——後端 #17／#24／#25 尚未實作（docs/api-status.md），這些仍走 mock；因此同意狀態仍是 mock 記憶體值，重新整理後歸零（前端擋上傳的邏輯不受影響，只是要再同意一次）
- 不做審核狀態邏輯：後端 `WireImage` 沒有審核欄位，真上傳一律 `available`；`UploadedModel` 的 `status`／`reupload` pill 型別維持，示範資料只在假資料模式顯示（見 What Changes）
- 不擋 20 張上限：後端對圖片數量沒有上限、20 不是契約值，前端擋等於發明產品規則；「n / 20」維持設計稿的純顯示文字
- 不從 `GET /images` 回填歷史模特照：後端沒有「模特照」來源值（`UploadSource` 只准 `object`，一般上傳由後端標 `upload`），用 `source=upload` 撈會把商品圖、Logo 全當成模特照；固定資料夾方案要靠資料夾名稱辨識、太脆。重新整理後清單消失、圖仍在圖庫「上傳」來源（與商品圖混在一起，也會出現在本頁「從圖庫選擇」彈窗），屬已知限制；日後若要區隔需後端在 `UploadSource` 加值
- 不改 `useAssets.ts`、`src/api/real.ts`、`src/api/mock.ts` 與既有 spec 檔（`mock.spec.ts`／`real.spec.ts`／`useAssets.spec.ts` 已覆蓋上傳與刪除鏈；本 repo 沒有 view 級測試慣例，view 層行為由 scratchpad 的 `smoke-upload.mjs` 真後端冒煙覆蓋）
- 不把「上傳列表項目可被選為試穿模特」做進來（uprow 沒有 click／aria-pressed），那屬於接 `POST /tryon` 那一步

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `tryon-ui`：新增「上傳模特照真的上傳到後端」要求——未同意先擋不上傳；選檔後經既有上傳路徑送到後端，清單記住後端 `imageId` 與縮圖 URL，上傳中停用控制項，失敗顯示對應錯誤文案；「刪除」走 `DELETE /images/{id}`；真後端不顯示示範列；mock 模式走同一條路徑。修改既有「模特可用內建或上傳真人照」：選取後顯示後端回傳的名稱、`accept`／提示文案對齊後端格式、未同意時不上傳

## Impact

- Affected specs: tryon-ui
- Affected code:
  - Modified: src/views/TryOnView.vue（`onModelUpload` 先檢查同意再走 `useAssets().upload`、`removeModel` 走 `deleteAssets`、示範列只在 mock、`UploadedModel` 新增 `url?`、`uploading` ref＋`aria-busy`＋`IconLoader.spin`、縮圖 v-if＋`@error`、`accept` 三種 MIME、錯誤對應、`.mdrop.isDisabled`／`.uprow__thumbImage` 樣式）
  - Modified: src/api/index.ts（匯出 `useRealBackend`）
  - Modified: src/lang/zh-Hant.ts、src/lang/en.ts（`tryOn.upload.hint` 既有值改 JPG／PNG／WebP）
  - New: （無）
  - Removed: （無）
