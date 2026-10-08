# brand-settings-ui Specification

## Purpose

TBD - created by archiving change 'sync-mv-08-design'. Update Purpose after archive.

## Requirements

### Requirement: 品牌設定分段呈現

品牌設定 SHALL 依「基本資料／視覺識別／文案風格／合規與授權」分段呈現，讓使用者能分區維護。

#### Scenario: 使用者切換設定分段

- **WHEN** 使用者在品牌設定頁切換到某個分段
- **THEN** 顯示該分段的欄位，其他分段內容不干擾

<!-- @trace
source: sync-mv-08-design, brand-real-backend-wiring
updated: 2026-09-04
code:
  - src/views/BrandSettingsView.vue
  - src/stores/brand.ts
  - src/utils/colors.ts
  - src/components/AppSearchbar.vue
  - src/api/mock.ts
  - src/api/real.ts
  - src/types/api.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 視覺識別可上傳 Logo 並管理色票

視覺識別 SHALL 支援上傳 Logo、從 Logo 抽取建議色、以及新增／編輯／移除品牌色票。品牌色票 SHALL 支援最多 10 色；「全部套用」SHALL 把偵測到的建議色全部加入色票（受 10 色上限限制），SHALL NOT 只加入前 3 色。色票的前 3 筆 SHALL 固定指派為主色／輔色／點綴色；第 4 筆以後 SHALL 依序自動命名為「點綴色2」「點綴色3」……，且 SHALL 提供可編輯輸入框讓使用者自行改名。色票達到 10 色上限時，SHALL NOT 顯示「新增」色票的操作入口。

#### Scenario: 使用者上傳 Logo 後套用建議色

- **WHEN** 使用者上傳 Logo
- **THEN** 系統分析並列出建議色，使用者可單獨或全部加入色票

#### Scenario: 使用者全部套用超過 3 種偵測到的顏色

- **WHEN** Logo 分析出 5 種建議色，使用者點擊「全部套用」
- **THEN** 5 種顏色全部加入色票（未超過 10 色上限），前 3 筆分別指派為主色／輔色／點綴色，第 4、5 筆自動命名「點綴色2」「點綴色3」

#### Scenario: 使用者自訂第 4 個以後色票的名稱

- **WHEN** 使用者點擊第 4 個（或之後）色票的名稱欄位並輸入新名稱
- **THEN** 該色票的名稱更新為使用者輸入的文字，不受自動命名規則限制

#### Scenario: 色票達到上限時隱藏新增入口

- **WHEN** 色票已有 10 筆
- **THEN** 「新增」色票的按鈕不再顯示，使用者無法再新增更多色票

<!-- @trace
source: sync-mv-08-design, brand-real-backend-wiring, feat-brand-color-palette-apply-all
updated: 2026-09-09
code:
  - src/views/BrandSettingsView.vue
  - src/stores/brand.ts
  - src/utils/colors.ts
  - src/components/AppSearchbar.vue
  - src/api/mock.ts
  - src/api/real.ts
  - src/types/api.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 文案風格可設定語氣與用語

文案風格 SHALL 支援語氣（可複選）、常用 hashtag、稱呼客戶方式與避免使用字詞。

#### Scenario: 使用者調整文案風格

- **WHEN** 使用者勾選語氣、新增 hashtag、填寫稱呼與避免字詞
- **THEN** 這些設定在「套用品牌設定」開啟時會帶入生成內容

<!-- @trace
source: sync-mv-08-design, brand-real-backend-wiring
updated: 2026-09-04
code:
  - src/views/BrandSettingsView.vue
  - src/stores/brand.ts
  - src/utils/colors.ts
  - src/components/AppSearchbar.vue
  - src/api/mock.ts
  - src/api/real.ts
  - src/types/api.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 提供合規與授權資訊

品牌設定 SHALL 提供「合規與授權」區塊，記錄授權範圍、使用規範與肖像／素材授權相關資訊，且使用者填寫的內容 SHALL 被存檔、下次進入時原樣帶回。

#### Scenario: 使用者檢視合規與授權

- **WHEN** 使用者切到「合規與授權」
- **THEN** 顯示授權範圍、使用規範與相關授權紀錄的維護介面

#### Scenario: 使用者編輯肖像權同意條款或圖片授權聲明後存檔

- **WHEN** 使用者修改「肖像權同意條款模板」或「圖片授權／使用聲明」後按下儲存
- **THEN** 這兩個欄位的內容會隨其餘品牌設定一併存檔，重新載入頁面後維持使用者填寫的內容（而非每次都還原成預設文案）

<!-- @trace
source: sync-mv-08-design, brand-real-backend-wiring
updated: 2026-09-04
code:
  - src/views/BrandSettingsView.vue
  - src/stores/brand.ts
  - src/utils/colors.ts
  - src/components/AppSearchbar.vue
  - src/api/mock.ts
  - src/api/real.ts
  - src/types/api.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->
