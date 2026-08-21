## Why

MantaGO 的 Figma 設計稿在 MV-02（圖生圖／AI 生成工作台底下的圖片生成頁，`GenerateImageView.vue`）也已經更新過，跟 MV-00、MV-01 遇到的情況一樣。這個 change 接續 `sync-mv-01-design` 完成後的下一頁，把圖生圖頁面跟最新設計稿對齊：目前這個頁面的圖示仍使用 `@tabler/icons-webfont`（`i.ti.ti-*`）過渡方案、按鈕已換成 MV-00/MV-01 建立的共用元件（`PrimaryButton`／`GhostButton`／`ChipButton`），但文案、間距、字級、色碼等細節尚未跟設計稿逐一比對；比對方式沿用 MV-00/MV-01 確立的人工流程（Figma MCP 額度持續受限於 View seat 的 Professional 方案，由使用者透過 Figma Inspect 面板逐一提供精確數值與 SVG）。

## What Changes

- 逐一核對 `GenerateImageView.vue` 的文案、間距、字級、行高、色碼，對齊設計稿的精確數值（比對過程持續進行，逐項記錄在 `tasks.md`）。
- 把頁面上仍使用 `i.ti.ti-*` 圖示字型的地方（參考圖上傳區、AI 輔助描述、進階設定收合箭頭、生成按鈕、結果卡片圖示），視情況換成設計稿提供的精確 SVG 素材（若設計稿本身就是用簡單線稿圖示、跟圖示字型視覺一致，則保留不換，避免不必要的改動）。
- 具體視覺細節（文案、間距、字級、色碼、是否有目前完全沒有的功能／畫面）待使用者提供 Figma Inspect 數值與畫面截圖後逐一確認，不在此預先假設——目前只拿到設計稿左側導覽列（「AI 生成工作台」為選取狀態）的部分，主要內容區域尚未收到完整內容，範圍可能會隨後續截圖增補（例如非同步生成進度呈現方式，若跟 MV-01 遇到的那組進度卡是同一套機制，會沿用 MV-01 proposal.md 裡「暫緩、留給後續 change 處理」的決定，不在這裡重做）。

## Capabilities

### New Capabilities
- `generate-image-ui`：圖生圖頁面（MV-02）——使用者選擇 AI 模型、上傳或從圖庫選取參考圖、輸入生成描述（含 AI 輔助擴寫與進階設定）、送出生成請求並檢視／存入圖庫／下載／重生成結果的畫面呈現。

### Modified Capabilities
（無）

備註：本 change 不改動共用外殼那個 capability（home-workbench-ui，屬於 MV-00）。若後續截圖顯示側邊欄「AI 生成工作台」的選取樣式跟目前 DefaultLayout.vue 已實作的不一致，再回來補上並改列為 Modified。此處刻意不加反引號，避免 spectra analyze 把它判讀成本 change 宣告了該 capability 卻缺少對應的 spec 檔。

## Impact

- `src/views/GenerateImageView.vue`
- 若比對後發現需要新的圖示 SVG 素材或共用元件調整，範圍會擴大到對應檔案（届時補充）
- 不涉及路由變動
