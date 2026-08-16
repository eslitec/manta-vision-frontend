# MV-01 工具列 Design QA

- Source visual truth: `C:\Users\Rogan\AppData\Local\Temp\codex-clipboard-c1a6f985-c8e4-41d3-8051-18c1889ecb38.png`
- Implementation screenshot: `C:\Users\Rogan\AppData\Local\Temp\manta-library-full-after.png`
- Focused implementation crop: `C:\Users\Rogan\AppData\Local\Temp\manta-library-toolbar-after-crop.png`
- Combined comparison: `C:\Users\Rogan\AppData\Local\Temp\manta-library-toolbar-comparison.png`
- Viewport: 1366×940 CSS px, device scale factor 1
- Source pixels: 1050×104
- Implementation pixels: 1366×940; focused crop 842×64
- State: MV-01 素材庫／全部素材／「全部」來源啟用

## Full-view evidence

實際頁面在 1366×940 下完整顯示搜尋、來源篩選、上傳按鈕、素材格線與分頁，未出現溢位或遮擋。

## Focused comparison evidence

- 來源 pill：22px 高、13px 字、0 12px padding、16px 圓角。
- 上傳圖片：36px 高、14px 字、18px 行高、0 16px padding、18px 圓角。
- 來源圖與實作截圖密度不同，combined comparison 僅比較控制項內部比例，不用於判定整列的絕對位置。

## Comparison history

1. Earlier finding: 來源選項誤用 29px chip 高度，視覺過厚；上傳按鈕因 `line-height: 1` 縮成約 32px，上下留白不足。
2. Fix: 來源選項改用 Figma pill 規格；上傳按鈕改用 36px 固定高度與 18px 行高。
3. Post-fix evidence: 瀏覽器實測尺寸與上述規格一致，無可執行的 P0／P1／P2 間距問題。

## Required fidelity surfaces

- Fonts and typography: Noto Sans TC 層級、字級與行高在本次範圍內通過。
- Spacing and layout rhythm: pill 與 upload button 的高度及內邊距通過。
- Colors and visual tokens: 沿用專案既有深藍、灰邊框與白底 token。
- Image quality and asset fidelity: 本次未新增或替換影像資產。
- Copy and content: 搜尋、來源選項與上傳圖片文案一致。

## Verification

- 搜尋框、來源選項與上傳按鈕均可見。
- 頁面無瀏覽器 console error。
- Focused comparison 未發現剩餘 P0／P1／P2 差異。

final result: passed
