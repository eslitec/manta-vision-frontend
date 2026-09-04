## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `841:618`（`ph_video`）設計上下文與截圖，圖示為攤平向量資產，無法直接讀出色碼，初步視覺比對判斷與現有 `$babyBlue` 相近，回覆使用者未發現明確落差，並請求提供實際渲染截圖或 PR 連結
- [x] 1.2 使用者提供 Figma 節點原始 SVG 原始碼，比對後找到色碼（`#AEB8CC` vs 實作 `$babyBlue` `#a5c8e6`）與幾何比例（Figma 半徑 21.33／`stroke-width:2` vs 實作半徑 30／`stroke-width:3`）兩處落差
- [x] 1.3 `IconPlayCircle.vue` 的圓形與三角形路徑改成 Figma 原始座標，保留 `currentColor` 慣例
- [x] 1.4 `TryOnView.vue` 的 `.result__box` 顏色改成 `#aeb8cc`
- [x] 1.5 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/tryon-ui/spec.md`：「首次進入與生成完成狀態分離」Requirement 補上圖示幾何／顏色數值與 Scenario、trace
- [ ] 2.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-tryon-result-icon-color`
