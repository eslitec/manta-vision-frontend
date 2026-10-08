## 1. 語系檔改成帶參數樣板

- [x] 1.1 `src/lang/zh-Hant.ts` 把 `editor.layerItems.original` 從 `'原圖：春季主視覺_01'` 改成帶參數樣板 `'原圖：{name}'`，比照 `editor.objectLayerDynamic` 的既有寫法
- [x] 1.2 `src/lang/zh-Hant.ts` 把 `editor.layerItems.text` 從 `'文字：春季新品 上市'` 改成帶參數樣板 `'文字：{text}'`
- [x] 1.3 `src/lang/en.ts` 對應調整 `editor.layerItems.original`／`editor.layerItems.text` 成帶參數樣板，兩邊 key 結構與參數名稱一致

## 2. layerLabel() 動態帶入真實資料

- [x] 2.1 對齊 Requirement「圖層清單的原圖與文字圖層名稱即時反映實際內容」新增內容：`src/components/ImageEditorWorkspace.vue` 的 `layerLabel(layer)` 函式，`type === 'original'` 時改成 `t('editor.layerItems.original', { name: selectedAssetName.value })`
- [x] 2.2 對齊 Requirement「圖層清單的原圖與文字圖層名稱即時反映實際內容」新增內容：`layerLabel(layer)` 函式，`type === 'text'` 時改成 `t('editor.layerItems.text', { text: textContent.value })`
- [x] 2.3 確認 `type === 'object'` 分支維持原本 `layer.label ?? ...` 邏輯不變，不受這次改動影響

## 3. 驗證

- [x] 3.1 對齊 Requirement「原圖圖層名稱反映實際載入的素材」——瀏覽器手動驗證（agent-browser CLI，因為真後端當下離線暫時改用本機 mock 模式驗證前端邏輯，demo 帳號 mavis）：進入編輯器，圖層清單「原圖」那一列顯示「原圖：春季主視覺_01」，跟編輯器上方標題「春季主視覺_01」一致——確認來源已經是 `selectedAssetName` 這個共用 ref，不是圖層面板自己另外寫死的字串
- [x] 3.2 對齊 Requirement「文字圖層名稱即時反映輸入內容」——瀏覽器手動驗證：新增文字圖層，圖層清單立即顯示「文字：輸入文字」（`editor.newTextPlaceholder`，不是舊的寫死示範文字「春季新品 上市」）；在屬性面板輸入「限時優惠中」後，圖層清單名稱即時變成「文字：限時優惠中」，與輸入框內容同步
- [x] 3.3 瀏覽器手動驗證：輸入描述「一束粉色乾燥花」並點擊「生成物件」，新增的物件圖層正確顯示「物件：一束粉色乾燥花」，確認決策 2 的物件圖層命名邏輯沒有被連帶改壞；同一時間圖層清單三種型別（物件／文字／原圖）皆正確顯示各自的真實資料
- [x] 3.4 `npm run lint` 與 `npx vue-tsc --noEmit` 通過
- [x] 3.5 執行 `spectra validate fix-editor-layer-names-dynamic --strict` 與 `spectra analyze fix-editor-layer-names-dynamic`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 3.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-editor-layer-names-dynamic`
