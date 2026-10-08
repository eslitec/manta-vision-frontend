## Why

MantaGO 的 Figma 設計稿在 MV-05（AI 試穿衣服，`TryOnView.vue`）也已更新過，跟 MV-00~04 遇到的情況一樣。這一頁初版實作完之後，設計稿補了幾個東西、也調整了細節，目前程式碼跟最新稿對不上：

- 設計稿在「選擇服飾素材」下方多了「套用品牌設定」開關（`brand_toggle`），程式碼沒有。
- 飼料消耗對不上：設計稿標「12 Tokens」，程式碼寫死「15 顆飼料」。
- 結果區設計稿有「存入圖庫／下載／重新生成」動作，程式碼只有佔位圖、沒有任何結果動作。
- 「上傳模特照」分頁在程式碼裡只切換了標籤、沒有真正的檔案上傳控制項，點了不會開啟本地選圖（功能缺失）。

以 Figma MCP（Dev seat）抓取的實際規格為準對齊，並沿用已確立的共用元件（`BrandToggle`／`OutlineButton`）。

## What Changes

- 系統性版面校正：設定面板 380 → 400px、雙欄 gap 20 → 16px、面板內距 22 → 24px。
- 在「選擇服飾素材」下方新增「套用品牌設定」開關（共用 `BrandToggle`）。
- 修正飼料消耗：由寫死「15 顆飼料」→「12 顆飼料」（對齊設計稿）。
- 結果區在生成完成後補上「存入圖庫（`OutlineButton`，可切換為已存入）／下載／重新生成」動作。
- 「上傳模特照」分頁補上真正的 `<input type="file">` 上傳區，點擊會開啟本地選圖；選了真人照片且尚未同意肖像使用時，自動跳出肖像同意視窗。

## Capabilities

### New Capabilities
- `tryon-ui`：AI 試穿頁（MV-05）——使用者選模特（內建或上傳真人照）、選服飾素材，在完成肖像同意的前提下生成試穿圖，並可存入圖庫／下載／重新生成。

### Modified Capabilities
（無——這是第一個碰到這個 capability 的 change）

## Impact

- `src/views/TryOnView.vue`
- 沿用：`src/components/BrandToggle.vue`、`OutlineButton.vue`、`ImagePickerDialog.vue`、`stores/consent`、`composables/useAssets`
- 以畫面呈現層為主；肖像同意流程沿用既有 `consentStore`。
