## Why

專案原本以 `PrimaryButton`、`OutlineButton`、`GhostButton`、`DialogButton`、`ChipButton` 與 `TopupButton` 分散管理按鈕樣式，同一個 Figma `btn` 元件的狀態與視覺規則因此重複存在，也容易在頁面內被區域 SCSS 覆寫。Figma 元件庫 `btn`（node `170:13`）已將按鈕定義為六種 type 與一致的互動狀態，程式碼應以相同模型管理。

## What Changes

- 新增單一共用 `AppButton`，以 `variant` 支援 `primary`、`secondary`、`outline`、`alert`、`ghost`、`subtle`。
- 支援 `default`、`hover`、`pressed`、`focus`、`disabled` 與 `loading` 狀態。
- 將真正對應 Figma `btn` 的頁面操作改用 `AppButton`，並移除六個舊按鈕元件。
- 保留 chip、tab、option card、icon-only、toolbar 與純文字操作的獨立語意及樣式，不將所有原生 `button` 強制轉成 `AppButton`。
- 共用按鈕使用 36px 高度、14px Medium 文字、18px 圓角與 Figma 指定色彩；帶圖示及儲值按鈕可用 16px 圓角。

## Capabilities

### New Capabilities

- `shared-button-components`：以單一元件與明確 variant 對應 Figma 按鈕系統，供各頁面重用。

### Modified Capabilities

無。

## Impact

- `src/components/AppButton.vue`
- MV00～MV09 頁面與共用 Dialog 中屬於 Figma `btn` 的操作
- 移除舊的六個按鈕元件
- `finish-git.sh` 的元件清單
