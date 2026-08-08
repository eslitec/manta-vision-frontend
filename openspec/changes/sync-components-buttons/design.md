## Context

6 個共用按鈕元件在初版實作時 Figma MCP 尚未串接，數值靠肉眼比對截圖，累積系統性誤差。MCP 恢復（Dev seat）後，抓元件庫實際實例逐一比對，歸納出 Figma 的按鈕統一規格並修正。所有元件都是 pug 模板 + scoped SCSS，色彩／陰影常數集中在 `_variables.scss`。

從 Figma `get_design_context` 抓到的精確規格（node id 為證據）：

| Figma 實例 | node | 填色/邊框 | 圓角 | padding | 字重 | 陰影 |
| --- | --- | --- | --- | --- | --- | --- |
| btn_生成試穿圖（主要填色）| 212:1574 | bg #2E3567 | 18px | 9px 16px | Regular 400 | 0 4 2 |
| btn_確認生成（對話框主要+圖示）| 213:1717 | bg #2E3567 | 16px | 9px pl10/pr14 | Medium 500 | 0 4 2 |
| btn_取消（外框）| 212:1628 | border #2E3567 | 18px | 9px 16px | Medium 500 | 0 4 2 |
| btn_從圖庫選擇（外框）| 212:1572 | border #2E3567 | 18px | 9px 16px | Medium 500 | 0 4 2 |
| btn_存入圖庫（外框）| 212:1576 | border #2E3567 | 18px | 9px 16px | Medium 500 | 0 4 2 |
| btn_topup_home（橘色）| 212:1520 | bg #EA903A | 16px | 9px 14px | Medium 500 | 0 4 2 |

## Goals / Non-Goals

**Goals:**

- 6 個共用按鈕元件的顏色、圓角、內距、字重、陰影對齊 Figma 元件庫。
- 只改視覺樣式，不動元件的 props 介面、模板結構、事件行為。

**Non-Goals:**

- 不重構「選錯元件」的畫面用法（例如某處該用外框鈕卻用了 chip）——那屬於各畫面的 `sync-mv-*` change。
- 不新增／合併按鈕元件；即使修正後 `GhostButton` 與 `OutlineButton` 外觀高度接近，仍各自保留（用法語意不同，避免牽一髮動全身）。

## Decisions

- **顏色修正在元件內把 `$blue-dark-300` 換成 `$blue-dark-500`，不改 `$blue-dark-300` 的變數定義。** `$blue-dark-300`（#171E52）同時是全站 body／標題文字色（`ConfirmGenerateDialog`、`FeedBadge`、`GenerationToast`、`TaskCenterPanel`、`ImagePickerDialog` 等都用它當文字色），若把定義改成 #2E3567，會連帶把所有文字改亮。Figma 的按鈕主色（#2E3567）正好等於既有的 `$blue-dark-500`，所以按鈕直接改用這個變數即可，語意也正確。考慮過的替代方案：改 `$blue-dark-300` 定義——已否決，波及全站文字色。
  - 附註：`sync-mv-00-design` 的 design.md 曾記載「已把 `$blue-dark-300` 從 #171E52 改成 #2E3567」，但實際 `_variables.scss` 仍是 #171E52——該修正沒有真的落地。本 change 改用「元件內換變數」的作法取代，避免全站文字色被牽動。

- **圓角統一 18px（對話框帶圖示版與橘色鈕為 16px）。** Figma 頁面按鈕一致是 18px 圓角矩形；程式碼原本混用 10px（Primary）與 999px 全圓（Ghost／Dialog／Chip），全圓 pill 是誤讀。對話框 `btn_確認生成` 與 `btn_topup_home` 在 Figma 是 16px，故 `TopupButton` 取 16px；`DialogButton` 因同時涵蓋 `btn_取消`（18px）與 `btn_確認生成`（16px），取頁面標準 18px 讓對話框按鈕組視覺一致（差 2px，可接受）。

- **陰影改用修正後的 `$btnBoxShadow`（0px 4px 2px）。** Figma 所有按鈕都是 `0 4 2`，程式碼的 `$btnBoxShadow` 是 `0 4 4`。此變數只被按鈕引用，直接改定義即可一次修正 Primary／Outline／Topup，其餘元件補上 `box-shadow: $btnBoxShadow`。

- **字重統一 Medium(500)。** Figma 按鈕多為 Noto Sans TC Medium；`PrimaryButton` 原本 600 過粗。主 CTA 節點（`btn_生成試穿圖`）雖標為 Regular 400，但取按鈕家族一致的 500，避免同類按鈕字重不一。

- **padding 統一 9px 16px（橘色鈕 9px 14px）、高度落在 36px。** `9px（上下）+ 14px 文字行高（含 lh18）+ 9px = 36px`，與 Figma 實例高度一致。`PrimaryButton` 原本 `11px 20px` 偏高偏寬。
