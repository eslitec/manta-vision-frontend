# Proposal：移至資料夾／刪除確認彈窗樣式對齊 Figma

## 為什麼

PR review（`nelsonliu-eslitec`）貼了 Figma（node `442:2860` 移至資料夾、`450:3221` 刪除確認）跟實際畫面的對照截圖，指出：

1. 移至資料夾彈窗的資料夾列樣式、「建立」按鈕樣式跟設計稿有差
2. 刪除確認彈窗的警示三角 icon 顏色跟設計稿不同；素材名稱過長時應該加 `text-overflow: ellipsis`

用 Figma MCP 逐一核對兩個彈窗的實際節點（拆解到 `opt_春季檔期`／`opt_常用商品圖`／`row_new` 的 btn／`dialog` 等 leaf node）取得精確的顏色／字重／邊框數值，確認 review 反映的落差都屬實。

## 做了什麼

- `src/views/LibraryView.vue`
  - `.modal__listItem`：未選取列改為 `$dark-blue-gray`（原本是過深的 `$blue-dark-300`）；`.isActive` 改為 `$blue-dark-500` + `font-weight: 500`（原本是 700）
  - `.modal__createBtn`：邊框／文字改為 `$blue-dark-500`（原本沿用 AppButton ghost variant 的灰色邊框），補上 Figma 有的投影
  - `.modal__previewName` 加 `text-overflow: ellipsis` + `white-space: nowrap`，`.modal__previewItem` 補 `min-width: 0` 讓 ellipsis 在 grid 版面下真的生效
  - 刪除確認彈窗的 `IconAlertTriangleFilled` 改傳 `color="currentColor"`，讓外層 `.modal__warnIcon` 原本就設定好的 `#ff6148` 生效
- `src/components/icons/IconAlertTriangleFilled.vue`：三角形本體改用 `color` prop（預設維持原本的 `#F2BB00` 黃色），避免影響這顆共用 icon 在 toast、影片生成警示、試穿同意彈窗、品牌合規、飼料用量等其他既有畫面的外觀（那些用法目前刻意維持黃色「一般警示」語意，只有這個「刪除、不可復原」情境要換成橘紅色）

未變動任何 Requirement 的規範文字，屬於 ingest 性質，補回 trace 的 `updated` 日期與 `source`。

## 影響範圍

只有圖庫的「移至資料夾」與「刪除確認」兩個彈窗的視覺樣式，互動行為不受影響；`IconAlertTriangleFilled` 新增的 `color` prop 有預設值，其他呼叫端不用修改也不會變色。
