## Problem

使用者實測「從圖庫選擇素材進編輯器 → 裁切 → 另存為新素材」這條路徑時，發現三個串連的問題：

1. 從圖庫選擇素材後，主畫布、修圖來源縮圖、修圖比對面板的「原圖」全部固定顯示灰色佔位圖示，跟選了哪張素材完全無關——選到的素材從沒被真的畫進畫面
2. 裁切完「另存為新素材」後，回到「從圖庫選擇」彈窗（打真的 `GET /images`）卻找不到剛存的那張
3. 另存失敗時畫面完全沒有反應，看起來像當機——沒有任何看得到的錯誤訊息

## Root Cause

1. `selectEditorAsset`（`ImagePickerDialog` 的 `@select` 處理器）之前只更新了 `selectedAssetName`（畫布標題文字），沒有把選到素材的 `url` 存下來，三處縮圖／畫布因此永遠沒有真實圖片可畫，只能顯示 `IconImagePlaceholder` 佔位
2. `saveAsNewAsset()` 一律呼叫 `saveEdited()` → `api.editImage()`，而 `realApi` 沒有覆寫這支方法（`realApi = { ...mockApi, ... }` 的展開清單裡沒有 `editImage`），切到真後端模式時實際上還是在跑 mock 版本——新素材只寫進瀏覽器本機的假資料陣列，從沒真的送到後端，圖庫／選圖器自然查不到
3. 存檔失敗時只設定 `saveError`（一個 `visuallyHidden` 的 `aria-live` alert），只有螢幕報讀器聽得到；對話框繼續開著、按鈕停止轉圈，肉眼看起來就像什麼都沒發生，沒有可見的錯誤橫幅

三者是同一次除錯串起來發現的：先解決「畫面沒圖」（1），才會摸到「另存到真後端」這個更深的問題（2），而修（2）改成走真的 canvas 匯出＋上傳流程後，新增的失敗模式（原圖跨網域讀取被擋、canvas 被污染）需要有看得到的錯誤呈現（3），三者放在同一個 change 處理。

## Proposed Solution

### 1. 選中的素材真的載入畫面（commit `3b417d5`）

- 新增 `selectedAssetUrl`（來源：`Asset.url`），`selectEditorAsset` 選中時一併寫入
- 主畫布、修圖來源縮圖、修圖比對面板的「原圖」三處改成：有 `url` 就顯示 `<img object-fit: cover>`，沒有 `url`（demo 素材／mock 資料本來就沒有真實檔案）才退回原本的 `IconImagePlaceholder` 佔位——不會因為這個改動讓 demo 狀態顯示破圖

### 2. 裁切的「另存為新素材」真的上傳到真後端（commit `435d598`）

- 後端已有對應的正式路徑（`manta-vision-backend` `docs/api/v7.md` §4 `POST /upload`）：帶 `sourceImageId` 時後端會標 `source=edit`、`derivedFrom` 指回原圖（非破壞性），不需要新端點
- `api/real.ts`／`api/mock.ts` 的 `uploadImage()` 多接一個 `sourceImageId` 參數；`api/mock.ts` 收到時比照真後端標成 `source: 'edit'`，並用 `URL.createObjectURL(file)` 讓假資料模式下縮圖也看得到真的裁切結果
- `composables/useAssets.ts` 的 `upload()` 轉發這個參數
- `ImageEditorWorkspace.vue` 新增 `buildCroppedFile()`：真的用 canvas 把目前的裁切範圍（換算過畫布 `object-fit: cover` 的顯示邏輯）從原圖畫成真正的圖檔；`saveAsNewAsset()` 在「裁切工具 + 已載入真實素材（有 `url`）」時改叫真的上傳 API（帶 `sourceImageId`），其餘情況（背景移除／加入物件／文字工具，或沒有真實圖檔來源的 demo 素材）維持原本 `saveEdited()`（mock）不變——這三個工具還沒有真正的像素合成邏輯，留到之後一起補

### 3. 另存失敗時顯示看得到的錯誤（commit `12e24f4`）

- `SaveAssetDialog.vue` 新增 `error` prop，有值時在按鈕列上方顯示紅色錯誤橫幅（`role="alert"`），取代原本只有螢幕報讀器聽得到的呈現
- `ImageEditorWorkspace.vue` 的 `buildCroppedFile()` 兩個失敗點換成好辨識的錯誤碼（`CROP_NO_SOURCE_IMAGE`／`CROP_IMAGE_LOAD_FAILED`／`CROP_EXPORT_BLOCKED`）；新增 `classifySaveError()` 把錯誤碼換成使用者看得懂的具體原因（沒有真實原圖／原圖讀取被擋可能是跨網域設定／其他一般錯誤），`saveAsNewAsset()` 的 `catch` 換成分類後設進 `saveErrorMessage`，並在原本所有重置 `saveError` 的地方一併清空
- 補上對應的中英文案（`editor.saveDialog.errorNoSourceImage`／`errorImageAccess`／`errorGeneric`）

## Non-Goals

- 不修「背景移除／加入物件／文字」三個工具的另存邏輯——這三個工具還沒有真正的像素合成邏輯，維持原本 mock 的另存行為，留到之後一起處理
- 不處理其他資料類型（影片）的另存或載入邏輯
- 不改動 `GET /images`／選圖彈窗本身的查詢邏輯，這次只確保裁切另存的產物真的存得到後端、查得到

## Success Criteria

- 從圖庫選擇一張有 `url` 的真實素材進編輯器，主畫布、修圖來源縮圖、修圖比對面板「原圖」都顯示該素材的實際圖片，不是佔位圖示
- 使用裁切工具另存為新素材後，回到「從圖庫選擇」彈窗能找到剛存的那張，其 `source` 標示為「編輯產物」
- 另存失敗時（例如原圖跨網域讀取被擋），畫面上出現看得到的紅色錯誤橫幅，說明具體原因，對話框維持開啟讓使用者可以重試
- `npx vue-tsc --noEmit` 與既有單元測試（`mock.spec.ts`／`real.spec.ts`／`useAssets.spec.ts`）全過

## Impact

- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue（`selectedAssetUrl`、`buildCroppedFile()`、`classifySaveError()`、`saveAsNewAsset()` 改造）
  - Modified: src/components/SaveAssetDialog.vue（新增 `error` prop 與可見錯誤橫幅）
  - Modified: src/api/real.ts（`uploadImage()` 新增 `sourceImageId` 參數）
  - Modified: src/api/mock.ts（`uploadImage()` 同步支援 `sourceImageId`，標記 `source: 'edit'`）
  - Modified: src/composables/useAssets.ts（`upload()` 轉發 `sourceImageId`）
  - Modified: src/lang/zh-Hant.ts（新增 `editor.saveDialog.errorNoSourceImage`／`errorImageAccess`／`errorGeneric`）
  - Modified: src/lang/en.ts（同上，兩語系同步）
