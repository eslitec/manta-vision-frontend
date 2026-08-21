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
source: sync-mv-08-design
updated: 2026-08-21
code:
  - src/views/BrandSettingsView.vue
  - src/stores/brand.ts
  - src/utils/colors.ts
  - src/components/AppSearchbar.vue
  - src/api/mock.ts
  - src/types/api.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 視覺識別可上傳 Logo 並管理色票

視覺識別 SHALL 支援上傳 Logo、從 Logo 抽取建議色、以及新增／編輯／移除品牌色票。

#### Scenario: 使用者上傳 Logo 後套用建議色

- **WHEN** 使用者上傳 Logo
- **THEN** 系統分析並列出建議色，使用者可單獨或全部加入色票

<!-- @trace
source: sync-mv-08-design
updated: 2026-08-21
code:
  - src/views/BrandSettingsView.vue
  - src/stores/brand.ts
  - src/utils/colors.ts
  - src/components/AppSearchbar.vue
  - src/api/mock.ts
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
source: sync-mv-08-design
updated: 2026-08-21
code:
  - src/views/BrandSettingsView.vue
  - src/stores/brand.ts
  - src/utils/colors.ts
  - src/components/AppSearchbar.vue
  - src/api/mock.ts
  - src/types/api.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 提供合規與授權資訊

品牌設定 SHALL 提供「合規與授權」區塊，記錄授權範圍、使用規範與肖像／素材授權相關資訊。

#### Scenario: 使用者檢視合規與授權

- **WHEN** 使用者切到「合規與授權」
- **THEN** 顯示授權範圍、使用規範與相關授權紀錄的維護介面

<!-- @trace
source: sync-mv-08-design
updated: 2026-08-21
code:
  - src/views/BrandSettingsView.vue
  - src/stores/brand.ts
  - src/utils/colors.ts
  - src/components/AppSearchbar.vue
  - src/api/mock.ts
  - src/types/api.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->
