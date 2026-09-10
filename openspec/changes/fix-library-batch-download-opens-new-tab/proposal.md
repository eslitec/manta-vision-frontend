## Problem

圖庫管理中心批次操作列的「下載」按鈕（`src/views/LibraryView.vue` 的 `downloadSelected` 函式）點擊後會開新分頁顯示圖片，不是真的觸發檔案下載。

## Root Cause

`downloadSelected()` 對每筆選取的素材建立一個 `<a>` 元素，把 `href` 直接設成素材的真實遠端網址（`a.url`，跟前端網站不同來源），同時設定 `link.download = a.name` 與 `link.target = '_blank'`。HTML 規格對 `<a download>` 屬性的行為是：只有「同源」或 `blob:`／`data:` 網址才會真的觸發瀏覽器下載；對跨網域網址，瀏覽器會直接忽略 `download` 屬性，退回成一般的連結導覽——因為同時設了 `target="_blank"`，結果就是開一個新分頁，而不是下載檔案。

專案裡 `src/components/ImageEditorWorkspace.vue` 的 `downloadRealFile(file: File)` 已經示範了正確處理方式：先用 `URL.createObjectURL(file)` 把真實的 `File`／`Blob` 物件轉成永遠同源的 `blob:` 網址，再把這個網址設成 `<a download>` 的 `href`，點擊後呼叫 `URL.revokeObjectURL` 釋放資源。`downloadSelected()` 目前手上只有素材的遠端網址字串，不是現成的 `File`／`Blob` 物件，需要先用 `fetch` 把內容讀成 `Blob`，再套用一樣的手法。

## Proposed Solution

`downloadSelected()` 改成 `async` 函式，對每一筆有 `url` 的選取素材：
1. 用 `try/catch` 包住 `fetch(a.url)`，取得回應後用 `.blob()` 讀出 `Blob` 內容
2. 用 `URL.createObjectURL(blob)` 建立同源的 `blob:` 網址
3. 建立 `<a>` 元素，`href` 設成這個 `blob:` 網址，`download` 設成 `a.name`，不再設定 `target="_blank"`
4. 點擊後呼叫 `URL.revokeObjectURL` 釋放資源
5. `catch` 區塊：`fetch` 失敗（例如素材伺服器沒有開放 CORS）時退回 `window.open(a.url, '_blank')`，維持「至少讓使用者看得到圖片」的行為，不讓這筆下載完全沒有反應

呼叫端（批次操作列「下載」按鈕的 `@click` 綁定）改成 async 函式後 fire-and-forget 呼叫即可，不需要 `await` 阻塞畫面。

## Non-Goals

- 不改變其他頁面（`GenerateImageView.vue`／`GenerateVideoView.vue`／`TryOnView.vue`／`MarketingPostView.vue`）明確標示 `TODO`、等待真後端提供檔案網址的下載佔位邏輯——那些目前完全沒有真實檔案可下載，是不同情境
- 不改變批次操作列其他動作（移至資料夾、移出資料夾、刪除）的邏輯
- 不改變素材資料本身的 `url` 欄位或後端 API

## Success Criteria

- 在圖庫管理中心勾選一或多筆有真實網址的素材，點擊「下載」，瀏覽器實際觸發檔案下載，不是開新分頁顯示圖片
- 多筆選取時每一筆都各自觸發下載
- 若素材伺服器沒有開放 CORS 導致 `fetch` 失敗，至少退回開新分頁而不是完全沒反應
- `npx vue-tsc --noEmit`、`npm run lint` 通過

## Impact

- Affected code:
  - Modified: src/views/LibraryView.vue
