## Problem

圖片編輯器（`ImageEditorWorkspace.vue`）「從圖庫選擇素材」彈窗（`ImagePickerDialog`）的標題與副標文案落後於 Figma 更新：標題應為「從圖庫選擇要編輯的素材」（Figma node `1246:2402`），副標應為「選擇後會載入畫布，原本的編輯內容會先提示是否儲存」（Figma node `1246:2403`），但實作維持舊文案。

## Root Cause

`ImagePickerDialog.vue` 是共用元件（編輯器、生成圖片、生成影片、行銷 PO 文、AI 試穿共五處都在用），原本只有 `title` 這個可選 prop，副標固定寫死使用 `t('imagePicker.subtitle')`（通用文案「隸屬機器人「日安選物」的素材與生成產物」）。但 Figma 對編輯器這一顆 dialog 已經改成專屬副標，跟其他四處共用同一顆元件的頁面不一樣——元件沒有對應的 `subtitle` prop 可以覆寫，導致編輯器這顆彈窗只能顯示不符合設計稿的通用副標。

版面（grid 4 欄、thumb 尺寸、gap、`sel_check` 徽章、頁尾按鈕）比對後跟設計稿一致，落差只在文案。

## Proposed Solution

- `ImagePickerDialog.vue` 新增可選的 `subtitle` prop（預設值維持原本的 `t('imagePicker.subtitle')` 通用文案，不影響其他四處呼叫端）
- `ImageEditorWorkspace.vue` 呼叫 `ImagePickerDialog` 時帶入新的 `subtitle`（`t('editor.sourcePickerSubtitle')`），並確認 `editorPickerTitle`（`t('editor.sourcePickerTitle')`）已對齊 Figma 新文案「從圖庫選擇要編輯的素材」
- `src/lang/zh-Hant.ts`／`en.ts` 補上 `editor.sourcePickerSubtitle`（連同確認 `editor.sourcePickerTitle` 已是最新文案），兩語系同步

## Non-Goals

- 不修改 `ImagePickerDialog.vue` 的版面（grid、thumb、徽章、按鈕），這些已經跟 Figma 一致
- 不修改其他四處呼叫端（生成圖片／生成影片／行銷 PO 文／AI 試穿）的 dialog 文案，`subtitle` prop 對它們維持不帶，繼續使用原本的通用副標
- 不處理「彈窗打開後是空的（0 個素材）」這個現象——這是真後端 `GET /images` 在這個環境/帳號底下確實沒有素材資料的執行期狀況，不是前端版面或文案的問題，沒有可以修的地方

## Success Criteria

- 從圖片編輯器點擊「從圖庫選擇」開啟 `ImagePickerDialog` 時，標題顯示「從圖庫選擇要編輯的素材」、副標顯示「選擇後會載入畫布，原本的編輯內容會先提示是否儲存」
- 其他四處呼叫 `ImagePickerDialog` 的頁面（生成圖片／生成影片／行銷 PO 文／AI 試穿）副標維持原本的通用文案，不受影響
- `npx vue-tsc --noEmit` 通過

## Impact

- Affected code:
  - Modified: src/components/ImagePickerDialog.vue（新增 `subtitle` prop 與 `resolvedSubtitle` computed）
  - Modified: src/components/ImageEditorWorkspace.vue（呼叫端帶入 `subtitle`）
  - Modified: src/lang/zh-Hant.ts（新增 `editor.sourcePickerSubtitle`）
  - Modified: src/lang/en.ts（同上，兩語系同步）
