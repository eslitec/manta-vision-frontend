## 1. 共用陰影變數

- [x] 1.1 `_variables.scss` 的 `$btnBoxShadow` 由 `0px 4px 4px 0px rgba(0,0,0,.25)` 改為 `0px 4px 2px 0px rgba(0,0,0,.25)`（對齊 Figma 所有按鈕的 `drop-shadow(0px 4px 2px …)`）。已確認此變數僅被 `PrimaryButton`／`OutlineButton`／`TopupButton` 引用，無其他非按鈕用途。

## 2. PrimaryButton（主要填色鈕）

對照 Figma `btn_生成試穿圖`（212:1574）／`btn_確認生成`（213:1717）。

- [x] 2.1 填色 `$blue-dark-300`（#171E52）→ `$blue-dark-500`（#2E3567）
- [x] 2.2 圓角 `10px` → `18px`
- [x] 2.3 padding `11px 20px` → `9px 16px`（高度對齊 36px）
- [x] 2.4 字重 `600` → `500`（Figma 為 Noto Sans TC Medium；主 CTA 節點實為 Regular 400，取家族一致的 Medium）

## 3. GhostButton（外框鈕，用於「從圖庫選擇」等）

對照 Figma `btn_從圖庫選擇`（212:1572）。

- [x] 3.1 外框 `1px $gray`（#D2D5DD 淺灰）→ `1px $blue-dark-500`（#2E3567 深藍）
- [x] 3.2 圓角 `999px`（全圓）→ `18px`
- [x] 3.3 padding `8px 16px` → `9px 16px`
- [x] 3.4 文字色 `$blue-dark-300` → `$blue-dark-500`
- [x] 3.5 補上 `box-shadow: $btnBoxShadow`（原本沒有陰影）

## 4. OutlineButton（外框鈕，既有最接近正確）

對照 Figma `btn_取消`（212:1628）。

- [x] 4.1 外框色 `$blue-dark-300` → `$blue-dark-500`
- [x] 4.2 文字色 `$blue-dark-300` → `$blue-dark-500`（圓角 18px、padding 9px 16px、`$btnBoxShadow` 原本就對，隨變數修正同步變成 0 4 2）

## 5. DialogButton（對話框動作鈕）

對照 Figma `btn_取消`（212:1628，plain）／`btn_確認生成`（213:1717，primary）。

- [x] 5.1 圓角 `999px` → `18px`
- [x] 5.2 padding `9px 18px` → `9px 16px`
- [x] 5.3 plain 外框 `1px $gray` → `1px $blue-dark-500`、plain 文字 `$blue-dark-300` → `$blue-dark-500`
- [x] 5.4 primary 填色 `$blue-dark-300` → `$blue-dark-500`、字重 `600` → `500`
- [x] 5.5 補上 `box-shadow: $btnBoxShadow`

## 6. ChipButton（小動作鈕，用於結果列「存入圖庫／下載」等）

對照 Figma `btn_存入圖庫`（212:1576）。

- [x] 6.1 圓角 `999px` → `18px`
- [x] 6.2 字級 `13px` → `14px`、padding `7px 14px` → `9px 16px`
- [x] 6.3 dark 填色 `$blue-dark-300` → `$blue-dark-500`、plain 文字色 `$blue-dark-300` → `$blue-dark-500`
- [x] 6.4 補上 `box-shadow: $btnBoxShadow`

## 7. TopupButton（橘色儲值鈕）

對照 Figma `btn_topup_home`（212:1520）。

- [x] 7.1 padding `6px 14px` → `9px 14px`（高度對齊 36px）
- [x] 7.2 圓角 `18px` → `16px`（橘色 `$orange` #EA903A、字重 500、陰影隨變數修正，皆已正確）

## 8. 驗證

- [x] 8.1 執行 `npm run build`（`vue-tsc --noEmit` + `vite build`）確認通過（型別檢查與打包皆成功）
- [x] 8.2 使用者於瀏覽器實際渲染比對 6 個按鈕外觀（多次截圖確認顏色／圓角／內距）
- [x] 8.3 選錯元件用法已確認：`GhostButton`（從圖庫選擇）修正後外觀與外框鈕一致；`存入圖庫`／結果動作等已於各 sync-mv change 改用 `OutlineButton`（如 MV-03／05 結果區）
