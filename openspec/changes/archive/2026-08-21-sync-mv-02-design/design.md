## Context

見 `proposal.md` 的 Why。這個 change 延續 `sync-mv-00-design`／`sync-mv-01-design` 建立的做法：Figma MCP 額度持續受限（View seat 的 Professional 方案），改由使用者用 Figma Inspect 面板逐一提供精確數值（色碼、間距、字級、行高比例）與 SVG 素材，取代肉眼比對截圖。每一項修改都會先跑 `npm run build` 確認編譯通過，再啟動本機開發伺服器搭配瀏覽器實際渲染結果（DOM／CSS 斷言）驗證，而不是只看程式碼推論。

`GenerateImageView.vue` 目前的按鈕已經是 MV-00/MV-01 建立的共用元件（`PrimaryButton`／`GhostButton`／`ChipButton`），不需要重新處理按鈕樣式集中化；但頁面上其餘的圖示（參考圖上傳區、AI 輔助描述、進階設定收合箭頭、生成按鈕、結果卡片圖示）仍是 `@tabler/icons-webfont`（`i.ti.ti-*`）過渡方案，是否需要替換要看設計稿實際樣式而定。

目前只收到使用者提供的設計稿左側導覽列部分（顯示「AI 生成工作台」為選取狀態），主要內容區域（模型選擇、參考圖、描述輸入、進階設定、生成結果）尚未收到，這份 design.md 會隨後續截圖／SVG 逐步增補。

## Goals / Non-Goals

**Goals:**
- 讓 `GenerateImageView.vue` 的視覺呈現（文案、間距、字級、行高、色碼、圖示）對齊目前的 Figma 設計稿。
- 沿用 MV-00/MV-01 已驗證的比對流程（Figma Inspect 數值 → 程式碼修改 → build＋瀏覽器渲染驗證 → 記錄進 `tasks.md`）。

**Non-Goals:**
- 不重新處理按鈕樣式集中化——`PrimaryButton`／`GhostButton`／`ChipButton` 已在 `centralize-button-components` 完成，這頁已經在用。
- 不預先假設這頁是否也有 MV-01 遇到的「非同步生成進度卡」需求；若後續截圖顯示有類似機制，會沿用 `sync-mv-01-design` proposal.md 的決定（暫緩、留給涉及 `DefaultLayout.vue` 的獨立 change 處理），不在這裡重做。
- 不處理 `DefaultLayout.vue` 共用外殼，除非比對後發現側邊欄「AI 生成工作台」選取樣式跟目前實作不一致。

## Decisions

（目前尚未有足夠的設計稿細節可以做技術決策；比對過程中若出現需要記錄的決定，會在這裡逐項補上，格式沿用 `sync-mv-01-design/design.md` 的模式：決定內容＋為什麼選這個而不是替代方案。）

## Risks / Trade-offs

- [Figma MCP 額度持續受限，只能靠使用者手動提供數值，逐項比對速度較慢] → 沿用 MV-00/MV-01 建立的流程：使用者提供 Inspect 截圖／數值 → 我對照程式碼修改 → build＋瀏覽器渲染驗證 → 記錄進 `tasks.md`／`design.md`。
- [目前只收到側邊欄部分的設計稿，主要內容區域細節未知，範圍可能隨後續截圖擴大（例如發現目前完全沒有的功能）] → 參照 MV-01 的先例，若範圍擴大到功能面會先跟使用者確認是否納入同一個 change，再更新 proposal.md 的 What Changes。

## Open Questions

- 圖生圖頁面是否也有非同步生成進度呈現（例如生成中的載入卡片、預估剩餘時間）？目前 `generate()` 只是單次等待 API 回應，沒有進度呈現；要等使用者提供對應的設計稿截圖才能確認是否要補上。
