# marketing-post-ui Specification

## Purpose

TBD - created by archiving change 'sync-mv-03-design'. Update Purpose after archive.

## Requirements

### Requirement: 設定區依序引導生成

設定區 SHALL 依序提供「選擇商品圖片」「商品介紹」「輸出比例」三個步驟，讓使用者在生成前完成所有必要輸入。

#### Scenario: 使用者選定輸出比例

- **WHEN** 使用者在設定區步驟 3 點選某個輸出比例卡片（1:1／16:9／9:16）
- **THEN** 該卡片顯示為選取狀態，且此比例會套用到生成結果的預覽比例

<!-- @trace
source: sync-mv-03-design
updated: 2026-08-21
code:
  - src/views/MarketingPostView.vue
  - src/components/ImagePickerDialog.vue
  - src/components/BrandToggle.vue
-->

---

### Requirement: 提供探索靈感素材入口

設定區 SHALL 在「商品介紹」下方提供「探索靈感素材」入口，並說明會依商品類別給文案風格建議。

#### Scenario: 使用者檢視商品介紹步驟

- **WHEN** 使用者檢視「商品介紹」區塊
- **THEN** 下方顯示「探索靈感素材」與「依商品類別給文案風格建議」說明

<!-- @trace
source: sync-mv-03-design
updated: 2026-08-21
code:
  - src/views/MarketingPostView.vue
  - src/components/ImagePickerDialog.vue
  - src/components/BrandToggle.vue
-->

---

### Requirement: 品牌設定開關可切換與編輯

設定區 SHALL 提供「套用品牌設定」開關，顯示副標「品牌色票・浮水印・文案語氣」，並提供前往品牌設定的「編輯」入口。

#### Scenario: 使用者切換品牌設定

- **WHEN** 使用者點擊品牌設定開關
- **THEN** 開關在開啟／關閉間切換，生成時依此決定是否帶入品牌語氣與 hashtag

#### Scenario: 使用者前往編輯品牌

- **WHEN** 使用者點擊品牌設定的「編輯」
- **THEN** App 導覽到品牌設定頁

<!-- @trace
source: sync-mv-03-design
updated: 2026-08-21
code:
  - src/views/MarketingPostView.vue
  - src/components/ImagePickerDialog.vue
  - src/components/BrandToggle.vue
-->

---

### Requirement: 生成貼文標示飼料消耗

設定區底部 SHALL 顯示預估飼料消耗，並提供「產生貼文」動作。

#### Scenario: 使用者檢視生成區

- **WHEN** 使用者檢視設定區底部
- **THEN** 顯示「預估消耗 5 顆飼料」與帶加號圖示的「產生貼文」按鈕

<!-- @trace
source: sync-mv-03-design
updated: 2026-08-21
code:
  - src/views/MarketingPostView.vue
  - src/components/ImagePickerDialog.vue
  - src/components/BrandToggle.vue
-->

---

### Requirement: 結果區呈現圖與文案兩欄

生成後 SHALL 以左右兩欄呈現結果：左欄為貼圖（比例吃輸出比例）與「換一張圖／下載」動作，右欄為文案與「複製文案／重寫文案」動作。

#### Scenario: 首次進入尚無生成結果

- **WHEN** 使用者首次進入 MV-03 且尚未完成生成
- **THEN** 結果區顯示空狀態提示，不預先偽造完成後圖片與文案

#### Scenario: 使用者複製文案

- **WHEN** 使用者點擊「複製文案」
- **THEN** 文案與 hashtag 一併複製到剪貼簿，按鈕顯示「已複製」

<!-- @trace
source: sync-mv-03-design
updated: 2026-08-21
code:
  - src/views/MarketingPostView.vue
  - src/components/ImagePickerDialog.vue
  - src/components/BrandToggle.vue
-->

---

### Requirement: 結果區提示下一步

結果區底部 SHALL 顯示帶圖示的提示框，說明「下一步：一鍵帶入群發訊息草稿」為需與主產品介接的 roadmap 項目。

#### Scenario: 使用者檢視結果區底部

- **WHEN** 生成完成後
- **THEN** 顯示淺藍底、左側藍邊的提示框：「下一步：一鍵帶入群發訊息草稿（需與主產品介接，roadmap 項目）」

<!-- @trace
source: sync-mv-03-design
updated: 2026-08-21
code:
  - src/views/MarketingPostView.vue
  - src/components/ImagePickerDialog.vue
  - src/components/BrandToggle.vue
-->
