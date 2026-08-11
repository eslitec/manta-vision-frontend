## Purpose

定義共用按鈕元件的視覺契約，確保每一種按鈕變體（主要填色、外框、對話框、chip、橘色儲值）在顏色、圓角、內距、字重與陰影上，皆符合 Figma 元件庫（`🧩 元件庫`）的統一規格，讓全站按鈕外觀一致且與設計稿相符。

## ADDED Requirements

### Requirement: 按鈕主色使用設計系統的深藍 #2E3567
所有以深藍為主色的按鈕（填色鈕的底色、外框鈕的邊框與文字、對話框主要鈕的底色）SHALL 使用 `$blue-dark-500`（#2E3567），而非 `$blue-dark-300`（#171E52）。此修正 SHALL 在各按鈕元件內完成，SHALL NOT 更動 `$blue-dark-300` 的變數定義，以免牽動全站文字色。

#### Scenario: 檢視主要填色按鈕
- **WHEN** 畫面顯示 `PrimaryButton`
- **THEN** 其底色為 #2E3567、文字為白色

#### Scenario: 檢視外框按鈕
- **WHEN** 畫面顯示 `GhostButton` 或 `OutlineButton`
- **THEN** 其邊框與文字為 #2E3567、底色為白色

### Requirement: 按鈕圓角統一為 18px
頁面層級的按鈕 SHALL 使用 18px 圓角矩形；帶圖示的對話框主要鈕與橘色儲值鈕 SHALL 使用 16px。SHALL NOT 使用 999px 全圓或 10px。

#### Scenario: 檢視任一頁面按鈕
- **WHEN** 顯示 `PrimaryButton`、`GhostButton`、`OutlineButton`、`DialogButton` 或 `ChipButton`
- **THEN** 其圓角為 18px

#### Scenario: 檢視橘色儲值按鈕
- **WHEN** 顯示 `TopupButton`
- **THEN** 其圓角為 16px、底色為橘色 #EA903A

### Requirement: 按鈕內距與高度一致
按鈕 SHALL 使用 `9px 16px` 的內距（橘色儲值鈕為 `9px 14px`），使按鈕高度落在 36px。

#### Scenario: 檢視按鈕高度
- **WHEN** 顯示任一共用按鈕（14px 字級）
- **THEN** 按鈕高度為 36px

### Requirement: 按鈕字重為 Medium
按鈕文字 SHALL 使用字重 500（Medium），SHALL NOT 使用 600 以上。

#### Scenario: 檢視按鈕文字
- **WHEN** 顯示任一共用按鈕
- **THEN** 其文字字重為 500

### Requirement: 按鈕陰影為 0px 4px 2px
帶陰影的按鈕 SHALL 使用 `$btnBoxShadow`（`0px 4px 2px rgba(0,0,0,.25)`）。

#### Scenario: 檢視帶陰影的按鈕
- **WHEN** 顯示 `PrimaryButton`、`OutlineButton`、`GhostButton`、`DialogButton`、`ChipButton` 或 `TopupButton`
- **THEN** 其陰影為 `0px 4px 2px rgba(0,0,0,.25)`
