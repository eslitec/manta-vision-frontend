## 1. 修正下載邏輯

- [x] 1.1 對齊 Requirement「批次下載素材真的觸發檔案下載，不是開新分頁」：`src/views/LibraryView.vue` 的 `downloadSelected` 改成 `async` 函式，對每一筆有 `url` 的選取素材用 `fetch(a.url)` 讀取內容並轉成 `Blob`，用 `URL.createObjectURL(blob)` 建立同源 `blob:` 網址設成 `<a download>` 的 `href`（移除原本的 `link.target = '_blank'`），點擊後呼叫 `URL.revokeObjectURL` 釋放資源
- [x] 1.2 對齊 Requirement「素材伺服器無法讀取內容時退回開啟新分頁」：`fetch` 失敗時（`catch` 區塊）退回 `window.open(a.url, '_blank', 'noopener')`
- [x] 1.3 確認批次操作列「下載」按鈕的 `@click` 呼叫端在 `downloadSelected` 改成 `async` 後仍正常運作（fire-and-forget，不需要 `await`）——`AppButton.batchbar__action(@click="downloadSelected")` 不需要改動

## 2. 驗證

- [x] 2.1 `npx vue-tsc --noEmit` 通過
- [x] 2.2 `npm run lint` 通過
- [x] 2.3 對齊 Requirement「點擊下載觸發真實檔案下載」——瀏覽器手動驗證（`agent-browser`，真後端帳號 `qa_brand_test`）：勾選一筆已上傳的真實素材（`login-bg.png`，R2 網址）並點擊「下載」，直接對該 R2 網址執行 `fetch()` 確認回傳 `error: Failed to fetch`——**R2 儲存桶目前沒有對前端網域開放 CORS**，導致 `fetch` 一定會失敗、必然走進本次新增的 catch 退回路徑（`window.open`）。程式碼本身的 blob 下載邏輯（決策與寫法比照 `ImageEditorWorkspace.vue` 的 `downloadRealFile` 既有正確寫法）在型別檢查與邏輯上是正確的，但**在目前這個環境，因為後端基礎設施限制，使用者實際觀察到的行為仍然是開新分頁，跟修復前一樣**——這不是這次程式碼修改能解決的問題，需要後端／基礎設施團隊在 R2 儲存桶設定 CORS（允許前端網域讀取內容，不只是顯示 `<img>`）之後，這個修復才會讓使用者真正看到檔案下載
- [x] 2.4 執行 `spectra validate fix-library-batch-download-opens-new-tab --strict` 與 `spectra analyze fix-library-batch-download-opens-new-tab`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 2.5 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-library-batch-download-opens-new-tab`
