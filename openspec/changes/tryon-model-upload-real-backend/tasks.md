## 1. 上傳走真後端

- [x] 1.1 對齊 Requirement「上傳模特照真的上傳到後端」：`src/views/TryOnView.vue` 的 `onModelUpload` 改為 `async`，改呼叫既有 `useAssets().upload(file)`（＝ `api.uploadImage`，真後端 multipart `POST /upload`，不帶 `source`／`folderId`），回傳 `Asset` 的 `id`／`name`／`url` 寫入 `uploadedModels`（`UploadedModel` 型別新增 `url?: string`），`status: 'available'`／`noteKey: 'consented'`；驗證：真後端模式（:5173）上傳一張 jpg，清單新增一列且圖庫「上傳」來源多一筆、該列 id 與後端 imageId 相同
- [x] 1.2 對齊 Requirement「上傳模特照真的上傳到後端」的縮圖行為：`.uprow__thumb` 內有 `url` 時顯示 `img.uprow__thumbImage`（`width/height: 100%`、`object-fit: cover`，比照 `.model__thumbImage`），沒有 `url` 才顯示 `IconImagePlaceholder`；驗證：真後端模式縮圖為 R2 圖片、mock 模式（`VITE_USE_MOCK`）仍為佔位圖示
- [x] 1.3 對齊 Requirement「上傳模特照真的上傳到後端」的上傳中停用：新增 `uploading` ref，`onModelUpload` 開頭 `if (uploading.value) return`、`try/finally` 復原；`input.mdrop__input` 加 `:disabled="uploading"`，`label.mdrop` 加 `:class="{ isDisabled: uploading }"` 與對應 `cursor: default; opacity: 0.6` 樣式；驗證：上傳期間 input 為 `disabled`，回應後恢復
- [x] 1.4 對齊 Requirement「上傳模特照真的上傳到後端」的錯誤顯示：`catch` 以 `isFileTooLarge`／`isUnsupportedFormat`（`src/utils/error.ts`）對應 `errors.fileTooLarge`／`errors.unsupportedFormat`，其餘 `errors.submitFailed`，寫入既有 `errorMsg`（sticky footer `p.err(role="alert")`），開始上傳時清空；驗證：mock 模式上傳 11MB 檔與 .gif 檔各一次，footer 依序出現「檔案超過 10MB 上限」「不支援的檔案格式」且清單不新增

## 2. 驗證

- [x] 2.1 `npx vitest run` 0 failed、`npx vue-tsc --noEmit` 與 `npm run lint` exit 0、`npx prettier --check` 改動檔通過；i18n 兩語系 key 集合與改動前相同（零新增 key；3.3 只改 `tryOn.upload.hint` 既有值）
- [x] 2.2 執行 `spectra validate tryon-model-upload-real-backend` 與 `spectra analyze tryon-model-upload-real-backend`，確認 valid 且 Coverage／Consistency／Gaps／Ambiguity 無發現
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive tryon-model-upload-real-backend`；驗收者注意已知限制：清單是元件狀態，重新整理後消失但圖仍在圖庫「上傳」來源（不是 bug）；`getConsent` 仍是 mock 記憶體值，重載後同意狀態歸零

## 3. 審查意見修正（2026-09-19）

- [x] 3.1 對齊 Requirement「上傳模特照真的上傳到後端」的肖像同意順序：`onModelUpload` 在呼叫 `upload` 之前 `if (!consented.value) { showConsent.value = true; return }`（比照 `onGenerate`），未同意時檔案不離開瀏覽器；移除原本上傳後才開視窗的寫法；驗證：真後端未同意選檔 → 無 `POST /upload`、清單不變、同意視窗開啟；同意後再選檔 → 一發 201
- [x] 3.2 對齊 Requirement「上傳模特照真的上傳到後端」的刪除：`removeModel` 改 `async`，非 `demo-` 開頭的 id 先走 `useAssets().deleteAssets([id])`（`DELETE /images/{id}`），`failedIds` 非空則保留列並以 `library.batchFailed`（count 1）顯示錯誤，成功才 filter 掉；驗證：真後端按「刪除」→ `DELETE /api/images/{id}` 200、列消失、圖庫「上傳」來源不再有該 id
- [x] 3.3 對齊 Requirement「模特可用內建或上傳真人照」：示範列 `demo-a`／`demo-b` 只在假資料模式初始化（`src/api/index.ts` 匯出 `useRealBackend`），真後端清單初始為空；`accept` 改 `image/jpeg,image/png,image/webp`、`tryOn.upload.hint` 兩語系改為 JPG／PNG／WebP（對齊後端 `_detect_format` 與 `errors.unsupportedFormat`）；縮圖 `@error="u.url = undefined"` 退回佔位圖示；上傳中 `label.mdrop` 加 `:aria-busy`、圖示換 `IconLoader.spin`；驗證：真後端模式 `.uprow` 初始 0 列、`accept` 屬性為三種 MIME、上傳後 `aria-busy="false"`
- [x] 3.4 真後端冒煙腳本 `scratchpad/tryon/smoke-upload.mjs`（puppeteer-core＋系統 Chrome，帳號 `e2e_gen_0919_8392`，上傳 `src/assets/images/login-bg.png`）：S0–S2、C1–C2、U1–U4、L1、D0–D2、L2、E1–E2 全 PASS；未觸發任何扣點端點；`browser.close()` 在 `finally`，結束後無 headless Chrome 殘留
- [x] 3.5 不修的發現與理由：「n / 20」純顯示（後端無上限、20 非契約，改成擋會發明產品規則；維持 Non-Goal）；模特照與商品圖在圖庫無法區分（後端 `UploadSource` 只准 `object`，需契約變更）；重新整理後清單消失（維持 Non-Goal，寫進 2.3 驗收備註）；view 層無自動化測試（repo 無 view 測試慣例，三元對應由 `utils/error` 既有測試與冒煙覆蓋）；`package-lock.json` 的未提交漂移不 stage
