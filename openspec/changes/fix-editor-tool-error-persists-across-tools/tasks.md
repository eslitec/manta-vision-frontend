## 1. 修正錯誤訊息殘留

- [x] 1.1 對齊 Requirement「背景移除的錯誤訊息只在背景移除工具底下顯示，不隨工具切換殘留」：`src/components/ImageEditorWorkspace.vue` 新增 `watch(tool, (value) => { if (value !== 'remove') toolError.value = '' })`
- [x] 1.2 對齊 Requirement「背景移除的錯誤訊息只在背景移除工具底下顯示，不隨工具切換殘留」：`p.editorError(v-if="toolError" role="alert")` 的顯示條件改成 `v-if="toolError && tool === 'remove'"`

## 2. 驗證

- [x] 2.1 `npx vue-tsc --noEmit` 通過
- [x] 2.2 `npm run lint` 通過
- [x] 2.3 對齊 Requirement「背景移除失敗後切換到其他工具，錯誤訊息不再顯示」——瀏覽器手動驗證（`agent-browser`，真後端帳號 `qa_brand_test`，飼料餘額 0）：嘗試背景移除觸發「生成失敗，請再試一次」，依序切到「加入物件」「文字」工具，`document.querySelector('.editorError')` 皆為 `null`，確認錯誤訊息不再顯示
- [x] 2.4 對齊 Requirement「切回背景移除工具後，錯誤提示行為維持正確」——瀏覽器手動驗證：切回「背景移除」工具，`.editorError` 仍為 `null`（因為該素材的背景移除已經記錄在「本次編輯已使用的 AI 工具」清單中，`selectRemoveTool` 判斷已用過而直接略過，不會誤顯示殘留的舊錯誤，符合預期）
- [x] 2.5 執行 `spectra validate fix-editor-tool-error-persists-across-tools --strict` 與 `spectra analyze fix-editor-tool-error-persists-across-tools`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 2.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-editor-tool-error-persists-across-tools`
