## ADDED Requirements

### Requirement: 上傳模特照真的上傳到後端

「上傳模特照」分頁選取檔案後，系統 SHALL 先檢查肖像使用同意：尚未同意時 SHALL NOT 送出檔案（檔案不離開瀏覽器），改為開啟肖像同意視窗，同意後使用者重新選檔。已同意時系統 SHALL 經由既有的素材上傳路徑（`useAssets().upload` → `api.uploadImage`，真後端為 multipart `POST /upload`）把檔案送到後端，SHALL NOT 帶 `source` 或 `folderId`（素材落在未分類、來源由後端標為 `upload`）。上傳成功後「已上傳模特」清單 SHALL 新增一列，其 `id` MUST 是後端回傳的 `imageId`、名稱 MUST 是後端回傳的 `imageName`（不帶 `imageName` 時即檔名），並記住後端回傳的 `url`；該列狀態 SHALL 顯示為「可用」。上傳進行中，上傳控制項 SHALL 停用（不可再選檔）、標示 `aria-busy` 並顯示載入圖示，完成或失敗後 SHALL 恢復。上傳失敗時清單 SHALL NOT 新增任何項目，並 SHALL 在底部固定區顯示對應的錯誤文案。清單每列的「刪除」對真上傳的列 SHALL 呼叫既有的刪除路徑（`useAssets().deleteAssets` → `DELETE /images/{id}`），成功才移除該列，失敗 SHALL 保留該列並顯示錯誤文案；示範列只從清單移出。在真後端模式下清單初始 SHALL 為空（示範列 `demo-a`／`demo-b` 只在假資料模式顯示）。檔案輸入的 `accept` SHALL 限為 `image/jpeg,image/png,image/webp`；縮圖載入失敗時 SHALL 退回佔位圖示。在假資料模式（`VITE_USE_MOCK`）下 SHALL 走同一條呼叫路徑，由 mock 的 `uploadImage`／`deleteImage` 回應。

#### Scenario: 真後端模式上傳成功

- **WHEN** 已完成肖像同意的使用者在真後端模式選取一張 jpg／png／webp 且不超過 10MB 的模特照
- **THEN** 前端以 multipart 表單 `POST /upload`（欄位只有 `file`，只送一發），清單新增一列：`id` 為後端 `imageId`、名稱為後端 `imageName`、縮圖顯示後端回傳的 `url`、狀態「可用」；圖庫「上傳」來源多出這一筆

#### Scenario: 假資料模式上傳成功

- **WHEN** 已完成肖像同意的使用者在假資料模式選取一張合法的模特照
- **THEN** 呼叫 mock 的 `uploadImage`，清單在兩列示範資料之後新增一列：名稱為檔名、縮圖因 mock 沒有 `url` 而顯示佔位圖示、狀態「可用」

#### Scenario: 上傳進行中

- **WHEN** 上傳請求尚未回應
- **THEN** 上傳區的檔案輸入為 `disabled`、`label` 帶 `aria-busy="true"`、圖示換成旋轉的載入圖示、上傳區呈現停用樣式；請求完成或失敗後恢復可用

#### Scenario: 上傳失敗

- **WHEN** 上傳被後端或 mock 拒絕、或請求本身失敗
- **THEN** 清單不新增項目，底部固定區以 `role="alert"` 顯示錯誤文案；再次上傳成功時該錯誤文案清空

##### Example: 錯誤碼對應文案

| 錯誤來源                                                                          | 顯示的 i18n key            |
| --------------------------------------------------------------------------------- | -------------------------- |
| 檔案超過 10MB（mock `Error('FILE_TOO_LARGE')`／真後端 413 `FILE_TOO_LARGE`）      | `errors.fileTooLarge`      |
| 格式不支援（mock `Error('UNSUPPORTED_FORMAT')`／真後端 415 `UNSUPPORTED_FORMAT`） | `errors.unsupportedFormat` |
| 其他任何錯誤（網路、5xx、401）                                                    | `errors.submitFailed`      |

#### Scenario: 尚未肖像同意就選檔

- **WHEN** 使用者尚未完成肖像使用同意就在「上傳模特照」選取檔案
- **THEN** 不送出任何請求（沒有 `POST /upload`）、清單不變，開啟肖像同意視窗；使用者完成同意後重新選檔才上傳

##### Example: 未同意時的請求與畫面

| 動作                                   | 網路請求                  | 清單     | 視窗             |
| -------------------------------------- | ------------------------- | -------- | ---------------- |
| 未同意、選取 `login-bg.png`            | 無                        | 不變     | 肖像同意視窗開啟 |
| 勾選確認並按「我知道了」後再選取同一檔 | `POST /upload` 一發 → 201 | 新增一列 | 不再開啟         |

#### Scenario: 刪除已上傳的模特照

- **WHEN** 使用者按下清單中真上傳那一列的「刪除」
- **THEN** 前端呼叫 `DELETE /images/{imageId}`；回 200 後該列移除、圖庫「上傳」來源不再有這筆；後端拒絕（例如 `ASSET_IN_USE`）時該列保留並在底部固定區顯示 `library.batchFailed`

#### Scenario: 真後端模式不顯示示範列

- **WHEN** 使用者在真後端模式（`VITE_USE_MOCK=false`）切到「上傳模特照」
- **THEN** 「已上傳模特」清單為空、不顯示 `demo-a`／`demo-b` 與「需重傳・審核未過」；假資料模式仍顯示兩列示範資料

#### Scenario: 縮圖載入失敗

- **WHEN** 清單某列的 `url` 載入失敗（R2 公開網域不可達等）
- **THEN** 該列縮圖退回佔位圖示，不顯示瀏覽器破圖

## MODIFIED Requirements

### Requirement: 模特可用內建或上傳真人照

選擇模特 SHALL 提供「內建模特庫」與「上傳模特照」兩種來源。選「上傳模特照」時 SHALL 提供可開啟本地檔案選取的上傳控制項，其 `accept` 限 `image/jpeg,image/png,image/webp`，提示文案與後端接受的格式一致（JPG／PNG／WebP）。

#### Scenario: 使用者上傳真人模特照

- **WHEN** 已完成肖像同意的使用者切到「上傳模特照」並點擊上傳區
- **THEN** 開啟本地檔案選取視窗；選取後檔案上傳到後端，清單顯示後端回傳的名稱（`imageName`，一般即檔名）與縮圖

#### Scenario: 上傳真人照片但尚未同意肖像使用

- **WHEN** 使用者尚未完成肖像使用同意就選取真人照片
- **THEN** 檔案不上傳，自動跳出肖像同意視窗要求先完成同意

##### Example: 未同意選檔

| GIVEN                                       | WHEN                | THEN                                             |
| ------------------------------------------- | ------------------- | ------------------------------------------------ |
| 頂部顯示「尚未完成肖像同意」提示、清單 0 列 | 選取 `login-bg.png` | 無 `POST /upload`、清單仍 0 列、肖像同意視窗開啟 |
