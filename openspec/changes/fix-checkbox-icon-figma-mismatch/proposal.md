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

## 影響範圍

只有 `AppCheckbox.vue` 這一個共用元件，使用它的畫面（圖庫多選、批次操作等）打勾符號視覺跟著變，核取方塊的互動行為（checked／indeterminate／disabled）不受影響。
