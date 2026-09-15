## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `1246:2399`（dialog_picker）／`1246:2402`（標題）／`1246:2403`（副標）的精確節點資料，確認文案落差屬實；版面（grid、thumb、徽章、按鈕）比對後已與設計稿一致，不需調整（commit `f072fc3`）
- [x] 1.2 對齊 Requirement「編輯器的素材選擇彈窗使用專屬標題與副標」（commit `f072fc3`）：`ImagePickerDialog.vue` 新增可選的 `subtitle` prop（預設維持 `t('imagePicker.subtitle')` 通用文案）與 `resolvedSubtitle` computed；`ImageEditorWorkspace.vue` 呼叫端帶入 `t('editor.sourcePickerSubtitle')`
- [x] 1.3 `src/lang/zh-Hant.ts`／`en.ts` 新增 `editor.sourcePickerSubtitle`，確認 `editor.sourcePickerTitle` 已是「從圖庫選擇要編輯的素材」最新文案，兩語系同步
- [x] 1.4 `npx vue-tsc --noEmit` 確認無錯誤

## 2. 驗證

- [x] 2.1 瀏覽器手動驗證：從圖片編輯器開啟「從圖庫選擇」彈窗，確認標題與副標對齊 Figma 新文案；分別開啟生成圖片／生成影片／行銷 PO 文／AI 試穿的選圖彈窗，確認副標維持原本通用文案，未被編輯器的專屬副標影響
- [x] 2.2 執行 `spectra validate fix-editor-picker-dialog-copy --strict` 與 `spectra analyze fix-editor-picker-dialog-copy`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 2.3 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-editor-picker-dialog-copy`
