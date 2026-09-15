## Context

Figma 元件庫 `btn`（node `170:13`）提供 `primary`、`secondary`、`outline`、`alert`、`ghost`、`subtle` 六種 type，各自具有 default、hover、pressed、focus、disabled 狀態。專案過去按使用情境拆成六個 Vue 元件，無法直接表達 Figma 的 type，也造成 Dialog 與頁面按鈕重複維護。

## Goals / Non-Goals

**Goals**

- 讓程式碼的 variant 與 Figma type 一對一。
- 集中管理顏色、互動狀態、尺寸、焦點與停用狀態。
- 逐頁確認操作的 Figma 元件類型後再替換。
- 維持鍵盤焦點可見、原生 disabled 與 loading 語意。

**Non-Goals**

- 不把 chip、tab、option card、model option、icon-only、tool button 或純文字連結併入 `AppButton`。
- 不因共用化改變既有點擊事件、路由或業務流程。

## Decisions

### 單一元件，以 variant 對應 Figma type

使用 `AppButton` 的 `variant` prop，而不是為每個 type 建立獨立元件。這可避免六份相似的模板與狀態 CSS，並降低頁面誤用顏色或互動狀態的風險。

### 共用視覺規則

- 基準高度：36px。
- 文字：14px、Medium 500、18px line-height。
- 一般圓角：18px；圖示緊湊版與儲值按鈕：16px。
- primary：`#2E3567`；secondary：`#EA903A`。
- primary、secondary、outline、alert 使用 `$btnBoxShadow`；ghost、subtle 不加陰影。
- focus 使用 Figma 黃色焦點環，並保留足夠辨識度的深藍外環以符合無障礙需求。

### 頁面對照原則

| 畫面／位置 | Figma type | 程式碼 |
| --- | --- | --- |
| 儲值 | secondary | `variant="secondary"` |
| 圖庫「上傳圖片」與「從圖庫加入」 | btn_icon／primary | `variant="primary" icon` |
| 主要生成、儲存、前往圖庫 | primary | 預設 variant |
| 從圖庫選擇、取消、下載、重新生成 | outline | `variant="outline"` |
| 批次刪除、永久刪除 | alert | `variant="alert"` |
| 批次下載、低強度文字操作 | ghost | `variant="ghost"` |
| 圖片結果次要操作 | subtle | `variant="subtle"` |

實際替換以對應畫面的 Figma instance 為準。MV03（node `12:2`）、MV04 結果畫面（node `491:9643`）、MV08（node `239:2924`）、圖庫批次列（node `440:6912`）及帶圖示按鈕元件（node `213:106`）已逐項核對。

## Risks / Trade-offs

- 頁面若以深層 selector 重寫共用按鈕，會再次造成漂移；頁面只應控制排列、寬度或 RWD，不應重寫 variant 顏色與狀態。
- 某些操作外觀看似按鈕，但在 Figma 屬於 chip、tab 或純文字 action；錯誤替換會改變尺寸與資訊層級，因此保留原元件。
