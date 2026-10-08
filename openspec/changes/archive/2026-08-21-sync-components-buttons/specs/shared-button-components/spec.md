## Purpose

定義程式碼與 Figma `btn` 元件一致的共用按鈕契約，避免各頁面重複實作按鈕的色彩、尺寸與互動狀態。

## ADDED Requirements

### Requirement: 共用按鈕 SHALL 對應 Figma type

系統 SHALL 以 `AppButton` 的 `variant` 表達 `primary`、`secondary`、`outline`、`alert`、`ghost`、`subtle` 六種 Figma type。

#### Scenario: 顯示主要操作

- **WHEN** 頁面顯示生成、儲存或前往圖庫等主要操作
- **THEN** 使用 `AppButton` 的 `primary` variant

#### Scenario: 顯示危險操作

- **WHEN** 頁面顯示刪除或永久刪除操作
- **THEN** 使用 `AppButton` 的 `alert` variant

### Requirement: 共用按鈕 SHALL 支援完整互動狀態

每個 variant SHALL 具有 default、hover、pressed、focus 與 disabled 狀態；執行非同步操作時 SHALL 可呈現 loading 狀態及 `aria-busy`。

#### Scenario: 鍵盤聚焦按鈕

- **WHEN** 鍵盤使用者將焦點移入按鈕
- **THEN** 顯示清楚可辨識的焦點環

#### Scenario: 按鈕停用

- **WHEN** 按鈕為 disabled 或 loading
- **THEN** 原生按鈕不可觸發，並呈現停用視覺

### Requirement: 共用按鈕 SHALL 使用一致尺寸

一般按鈕 SHALL 為 36px 高、14px Medium 文字、18px 圓角；緊湊或帶圖示版本 SHALL 使用 16px 圓角。

#### Scenario: 顯示一般按鈕

- **WHEN** 頁面渲染預設尺寸的 `AppButton`
- **THEN** 最小高度為 36px，文字為 14px／500／18px line-height

### Requirement: 非 btn 控制項 SHALL 保留獨立元件

Figma 中的 chip、tab、option card、model option、icon-only 與 tool button SHALL NOT 因為底層使用 `<button>` 就改成 `AppButton`。

#### Scenario: 顯示可選取的 chip

- **WHEN** 使用者選擇來源、比例或篩選條件
- **THEN** 使用對應的 chip 或 option 樣式，並透過 `aria-pressed` 或 tab 語意表達狀態
