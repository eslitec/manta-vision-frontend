## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 MV09 11 個子畫面（`615:5312` 底下）的精確節點資料，找出與實作有落差的畫面
- [x] 1.2 加入物件改為框選＋文字描述生成流程，移除素材庫疊圖路徑（commit TBD）
- [x] 1.3 指令修圖改為常用指令快速鍵＋一口價計費，移除跟快速修飾共用的分項勾選清單（commit TBD）
- [x] 1.4 裁切選定固定比例後顯示套用結果徽章與復原/重新裁切/另存操作（commit TBD）
- [x] 1.5 背景移除執行中顯示畫布處理覆蓋層（commit TBD）
- [x] 1.6 AI 修圖比對面板在處理中顯示進度狀態（commit TBD）
- [x] 1.7 `npx vue-tsc --noEmit` 與 `npx eslint` 都跑過確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：更新「AI 工具即時扣款並顯示成本」「AI 修圖提供分項修飾與對比」「裁切提供各通路預覽且不扣飼料」三個 Requirement 的內容／Scenario／trace
- [x] 2.2 `openspec/specs/image-editor-ui/spec.md`：新增「加入物件為文字描述生成，非從圖庫疊圖」Requirement
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-editor-figma-mismatches`
