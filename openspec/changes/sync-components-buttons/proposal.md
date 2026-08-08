## Why

共用按鈕元件（`PrimaryButton`、`GhostButton`、`OutlineButton`、`DialogButton`、`ChipButton`、`TopupButton`）當初實作時 Figma MCP 尚未串接，顏色／圓角／padding／字重／陰影多半是靠肉眼比對截圖猜出來的，累積了系統性誤差。這次 Figma 已升級為 Dev seat、MCP 可正常讀取，抓了元件庫（`🧩 元件庫`）裡 6 個實際按鈕實例（`btn_確認生成` 213:1717、`btn_取消` 212:1628、`btn_從圖庫選擇` 212:1572、`btn_生成試穿圖` 212:1574、`btn_存入圖庫` 212:1576、`btn_topup_home` 212:1520）的精確規格逐一比對，確認並修正落差。

比對後歸納出 Figma 的按鈕統一規格：**高 36px、`padding: 9px 16px`、圓角 18px（帶圖示的對話框版 16px、橘色儲值鈕 16px）、主色 `#2E3567`、陰影 `0px 4px 2px rgba(0,0,0,.25)`、字級 14px、字重 Medium(500)**。

發現的主要落差：

- **顏色**：多數按鈕用 `$blue-dark-300`（#171E52），但設計要的是 `#2E3567`（等同既有的 `$blue-dark-500`）。注意 `sync-mv-00-design` 的 design.md 曾宣稱這個色碼已在變數層修好（#171E52 → #2E3567），但 `_variables.scss` 實際上仍是 `$blue-dark-300: #171E52`——那次修正沒有真的進到程式碼。
- **圓角**：設計統一 18px 圓角矩形，程式碼卻混用 10px（Primary）與 999px 全圓（Ghost／Dialog／Chip）。
- **邊框色**：`GhostButton`／`DialogButton(plain)` 用 `$gray`（#D2D5DD 淺灰）當外框，設計是 `#2E3567` 深藍——最明顯的視覺錯誤。
- **padding／字重／陰影**：`PrimaryButton` 是 `11px 20px`／`600`（應 `9px 16px`／`500`）；共用陰影 `$btnBoxShadow` 是 `0 4 4`（應 `0 4 2`）。

## What Changes

- `$btnBoxShadow` 由 `0px 4px 4px` 改為 `0px 4px 2px`（一次修正 Primary／Outline／Topup 三個元件的陰影；此變數只被按鈕使用，確認過無其他引用）。
- `PrimaryButton`：填色 `$blue-dark-300` → `$blue-dark-500`、圓角 `10px` → `18px`、padding `11px 20px` → `9px 16px`、字重 `600` → `500`。
- `GhostButton`：外框 `$gray` → `$blue-dark-500`、圓角 `999px` → `18px`、padding `8px` → `9px`、文字色 `$blue-dark-300` → `$blue-dark-500`、補上 `box-shadow: $btnBoxShadow`。
- `OutlineButton`：外框與文字色 `$blue-dark-300` → `$blue-dark-500`（圓角 18px、padding 9px 16px 原本就對）。
- `DialogButton`：圓角 `999px` → `18px`、padding `9px 18px` → `9px 16px`、plain 外框 `$gray` → `$blue-dark-500`、plain 文字與 primary 填色 `$blue-dark-300` → `$blue-dark-500`、補上 `box-shadow`。
- `ChipButton`：圓角 `999px` → `18px`、字級 `13px` → `14px`、padding `7px 14px` → `9px 16px`、色 `$blue-dark-300` → `$blue-dark-500`、補上 `box-shadow`。
- `TopupButton`：padding `6px 14px` → `9px 14px`、圓角 `18px` → `16px`（橘色 `$orange` #EA903A、字重 500 原本就對）。
- **不動 `$blue-dark-300` 的變數定義**：它同時是全站 body 文字色（對話框標題、`FeedBadge`、`GenerationToast`、`TaskCenterPanel` 等都用它當文字色），改定義會連帶改到所有文字。因此顏色修正在各按鈕元件內把 `$blue-dark-300` 換成 `$blue-dark-500`，而非改源頭。

## Capabilities

### New Capabilities

- `shared-button-components`：共用按鈕元件的視覺契約——每一種按鈕變體（主要填色、外框、對話框、chip、橘色儲值）在顏色、圓角、內距、字重、陰影上皆符合 Figma 元件庫的統一規格。

### Modified Capabilities

（無）

## Impact

- `src/assets/scss/_variables.scss`（`$btnBoxShadow`）
- `src/components/PrimaryButton.vue`、`GhostButton.vue`、`OutlineButton.vue`、`DialogButton.vue`、`ChipButton.vue`、`TopupButton.vue`
- 連帶（視覺）：所有使用這些按鈕的畫面（8 個 view 與多個 dialog）——外觀會更貼近設計稿；無邏輯／DOM 結構變動。
- `npm run build`（`vue-tsc --noEmit` + `vite build`）通過。
