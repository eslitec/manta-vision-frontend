# tryon-ui Specification

## Purpose

TBD - created by archiving change 'sync-mv-05-design'. Update Purpose after archive.

## Requirements

### Requirement: 模特可用內建或上傳真人照

選擇模特 SHALL 提供「內建模特庫」與「上傳模特照」兩種來源。選「上傳模特照」時 SHALL 提供可開啟本地檔案選取的上傳控制項。

#### Scenario: 使用者上傳真人模特照

- **WHEN** 使用者切到「上傳模特照」並點擊上傳區
- **THEN** 開啟本地檔案選取視窗；選取後顯示檔名

#### Scenario: 上傳真人照片但尚未同意肖像使用

- **WHEN** 使用者上傳真人照片且尚未完成肖像使用同意
- **THEN** 自動跳出肖像同意視窗要求先完成同意

<!-- @trace
source: sync-mv-05-design
updated: 2026-08-21
code:
  - src/views/TryOnView.vue
  - src/components/BrandToggle.vue
  - src/components/ImagePickerDialog.vue
  - src/stores/consent.ts
-->

---

### Requirement: 生成前需完成肖像同意

在使用者尚未完成肖像同意時，SHALL 於頂部顯示同意提示，且按下生成時 SHALL 先要求完成同意才繼續。

#### Scenario: 未同意即嘗試生成

- **WHEN** 使用者未完成肖像同意就按「生成試穿」
- **THEN** 跳出肖像同意視窗，不進行生成

<!-- @trace
source: sync-mv-05-design
updated: 2026-08-21
code:
  - src/views/TryOnView.vue
  - src/components/BrandToggle.vue
  - src/components/ImagePickerDialog.vue
  - src/stores/consent.ts
-->

---

### Requirement: 顯示品牌設定開關與飼料消耗

設定區 SHALL 提供預設關閉的「套用品牌設定」開關，並在底部顯示預估飼料消耗（12 顆）與生成動作。

#### Scenario: 使用者檢視設定區底部

- **WHEN** 使用者檢視設定區
- **THEN** 顯示預設關閉的品牌設定開關，底部顯示「預估消耗 12 顆飼料」與「生成試穿」

<!-- @trace
source: sync-mv-05-design
updated: 2026-08-21
code:
  - src/views/TryOnView.vue
  - src/components/BrandToggle.vue
  - src/components/ImagePickerDialog.vue
  - src/stores/consent.ts
-->

---

### Requirement: 首次進入與生成完成狀態分離

系統 SHALL 在首次進入且尚未生成時顯示空的試穿結果預覽；完成生成後才顯示結果動作。

#### Scenario: 使用者首次進入 MV-05

- **WHEN** 尚未完成任何試穿生成
- **THEN** 結果區顯示空預覽
- **AND** 不顯示「存入圖庫／下載／重新生成」動作

#### Scenario: 試穿生成完成

- **WHEN** 試穿生成成功
- **THEN** 結果區顯示生成結果與「存入圖庫／下載／重新生成」動作

<!-- @trace
source: sync-mv-05-design
updated: 2026-08-21
code:
  - src/views/TryOnView.vue
  - src/components/BrandToggle.vue
  - src/components/ImagePickerDialog.vue
  - src/stores/consent.ts
-->

---

### Requirement: 結果可存入圖庫／下載／重新生成

生成完成後 SHALL 提供「存入圖庫」「下載」「重新生成」動作；存入後 SHALL 顯示「已存入」。

#### Scenario: 使用者存入試穿結果

- **WHEN** 使用者對已生成的試穿圖點擊「存入圖庫」
- **THEN** 結果落地成 AI 生成素材，按鈕顯示「已存入」

<!-- @trace
source: sync-mv-05-design
updated: 2026-08-21
code:
  - src/views/TryOnView.vue
  - src/components/BrandToggle.vue
  - src/components/ImagePickerDialog.vue
  - src/stores/consent.ts
-->

---

### Requirement: 左側設定面板在高度不足時面板內部捲動

左側設定面板（`section.panel.tryon__input`）在寬螢幕（≥ 1281px）且視窗高度不足以顯示全部內容時，SHALL 只在面板內部出現垂直捲軸，不 SHALL NOT 使內容溢出版面或造成畫面錯位；底部「預估消耗／生成試穿」SHALL 保持固定不隨內容捲動。

#### Scenario: 已上傳模特清單過長或視窗高度不足

- **WHEN** 使用者在寬螢幕（≥ 1281px）切到「上傳模特照」並疊加多筆已上傳項目，或瀏覽器視窗高度較小
- **THEN** 捲軸只出現在 `section.panel.tryon__input` 內部，底部「預估消耗／生成試穿」保持固定不隨內容捲動，內容不會溢出或裁切

<!-- @trace
source: sync-mv-05-design, fix-tryon-panel-scroll-y
updated: 2026-09-03
code:
  - src/views/TryOnView.vue
-->
