# Proposal：修正核取方塊打勾圖示跟 Figma 不一致

## 為什麼

PR review（`nelsonliu-eslitec`）在 `src/components/AppCheckbox.vue` 的變更留言：「icon 好像跟 figma 的不一樣」。

實際比對 Figma（`MantaGO-draft` node `441:2640` 裡的 `chk` 元件）後確認 review 反映的問題屬實：

- Figma 的打勾根本不是向量圖示，是純文字「✓」字元（Noto Sans TC Bold, 11px, 白色）
- 程式碼原本用 `IconCheck.vue` 這個自訂 SVG 路徑，筆畫偏瘦長、比例跟文字符號對不上

這是既有 `shared-button-components` spec 底下「共用按鈕元件」相關 Requirement 已經在追蹤的檔案（`AppCheckbox.vue`），但 spec 本身沒有具體訂出打勾符號要用文字還是向量圖示，屬於實作跟設計稿之間的視覺 drift，不是規格衝突。

## 做了什麼

- `src/components/AppCheckbox.vue`：打勾改用純文字「✓」＋ `font-weight: 700`，拿掉不再使用的 `IconCheck` import（commit `4cda120`）
- 未變動任何 Requirement 的規範文字；本 change 屬於 ingest 性質，補回 trace 的 `updated` 日期與 `source`

## 後續調整（ingest，2026-09-08）：打勾符號改回向量圖示

commit `662b9a4`：使用者直接提供圖庫管理中心素材卡片實際使用的打勾 SVG（18×18、深藍圓角方框＋白色勾勾路徑），要求換成向量圖示。這**反轉了本 change 第一輪的結論**——當時依 PR review 對照 Figma `441:2640` 的 `chk` 元件截圖，判斷是純文字字元；這次使用者提供的是實際的原始 SVG 匯出資料，比截圖比對更可靠，確認打勾其實是向量圖示，不是文字。

- `src/components/AppCheckbox.vue`：`.appCheckbox__check` 改回 `svg` + `path`（`viewBox 0 0 18 18`，`fill="currentColor"`），移除文字字元與 `font-weight: 700`；box 本身的圓角方框背景（`1.125rem`、`border-radius: 4px`、選中時填 `$blue-dark-500`）不受影響
- `openspec/specs/shared-button-components/spec.md`：**新增**一個獨立 Requirement「AppCheckbox 打勾符號 SHALL 使用向量圖示，不使用文字字元」——第一輪 ingest 只補了 trace 日期，從沒真的把這個視覺決定寫進規範文字，這正是這次會被使用者以另一個相反答案再次「修正」的原因之一；這次把結論與沿革都寫進 spec，附上兩輪決策的對照說明，避免第三次靠肉眼重新猜一次

## 影響範圍

只有 `AppCheckbox.vue` 這一個共用元件，使用它的畫面（圖庫多選、品牌設定合規頁勾選、編輯器另存對話框等）打勾符號視覺跟著變，核取方塊的互動行為（checked／indeterminate／disabled）不受影響。
