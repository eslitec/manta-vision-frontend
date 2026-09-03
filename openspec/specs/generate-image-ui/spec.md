# generate-image-ui Specification

## Purpose

TBD - created by archiving change 'sync-mv-02-design'. Update Purpose after archive.

## Requirements

### Requirement: 圖生圖頁面呈現對齊設計稿

系統 SHALL 讓 `GenerateImageView.vue` 的文案、間距、字級、行高、色碼與圖示對齊目前的 Figma 設計稿。

#### Scenario: 頁面渲染符合設計稿數值

- **WHEN** 使用者開啟圖生圖頁面
- **THEN** 頁面上的間距、字級、行高、色碼與設計稿透過 Figma Inspect 提供的精確數值一致

#### Scenario: 進階設定收合列與展開面板對齊設計稿

- **WHEN** 使用者點開「進階設定」
- **THEN** 收合列 SHALL 顯示 `1.5px` 邊框、`#eff2fa` 底色與 `#2e3567` 文字色的樣式；展開面板 SHALL 包含參考強度滑桿、負面提示欄（含字數 X / 200 計數）、種子欄（含「隨機」帶入與「鎖定」按鈕、下方提示文字）與「恢復預設值」列

#### Scenario: 展開進階設定時面板內部捲動

- **WHEN** 使用者在寬螢幕（≥ 1024px）展開「進階設定」，導致左側面板內容超出可視高度
- **THEN** 捲軸 SHALL 只出現在 `section.panel.genimg__input` 內部（即步驟區塊），底部「預估消耗／生成圖片」的 sticky footer SHALL 保持固定不隨內容捲動，頁面本身不出現垂直捲軸

<!-- @trace
source: sync-mv-02-design, fix-mv02-genimg-advanced-scroll
updated: 2026-09-03
code:
  - src/views/GenerateImageView.vue
  - src/components/ModelOption.vue
  - src/components/ImagePickerDialog.vue
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 選擇模型、參考圖與描述後送出生成

系統 SHALL 讓使用者選擇 AI 模型、上傳或從圖庫選取參考圖、輸入文字描述（可用 AI 輔助擴寫、可調整進階設定），並送出生成請求。

#### Scenario: 送出生成請求

- **WHEN** 使用者已選擇模型與輸入描述，點擊「生成圖片」
- **THEN** 系統依目前選擇的模型、參考圖、描述、進階設定與生成張數送出生成請求，並顯示生成中狀態

#### Scenario: 飼料不足時提示

- **WHEN** 使用者送出生成請求但飼料餘額不足
- **THEN** 系統顯示「飼料不足，請先儲值。」的錯誤訊息，不建立生成結果

<!-- @trace
source: sync-mv-02-design
updated: 2026-08-21
code:
  - src/views/GenerateImageView.vue
  - src/components/ModelOption.vue
  - src/components/ImagePickerDialog.vue
-->

---

### Requirement: 生成結果的後續操作

系統 SHALL 讓使用者對每筆生成結果執行存入圖庫、下載、重生成。

#### Scenario: 存入圖庫

- **WHEN** 使用者對某筆尚未存入圖庫的生成結果點擊「存入圖庫」
- **THEN** 系統將該結果存為圖庫素材，並將該筆結果標記為已存入

#### Scenario: 重生成

- **WHEN** 使用者對某筆生成結果點擊「重生成」
- **THEN** 系統以相同的模型、參考圖、描述、進階設定重新生成一張，並取代原本該筆結果

<!-- @trace
source: sync-mv-02-design
updated: 2026-08-21
code:
  - src/views/GenerateImageView.vue
  - src/components/ModelOption.vue
  - src/components/ImagePickerDialog.vue
-->
