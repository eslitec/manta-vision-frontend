## 1. 依賴與 mock 資料

- [x] 1.1 落地設計決策「決策 1：新增 `swiper` npm 依賴，使用官方 `swiper/vue` 元件整合」：`package.json` 新增 `swiper` 依賴並安裝
- [x] 1.2 落地設計決策「決策 3：先幫 mock 資料補上 `category: 'model'` 的素材」：`src/api/mock.ts` 的 `MATERIALS` 新增超過 4 筆 `category: 'model'` 的素材（欄位比照現有 `background`/`object` 條目）

## 2. TryOnView 串接真實資料與 Swiper

- [x] 2.1 落地設計決策「決策 4：`TryOnView.vue` 改成非同步載入模特素材，取代寫死的 `models` computed」：新增 `ref<Material[]>([])`，`onMounted` 呼叫 `api.listMaterials('model')` 寫入；移除寫死的 `models` computed
- [x] 2.2 落地設計決策「決策 2：`slidesPerView: 4` ＋ Swiper Navigation 模組」：「內建模特庫」分頁改用 `Swiper`／`SwiperSlide`（從 `swiper/vue` 匯入）呈現素材列表，設定 `slidesPerView: 4`，啟用 `Navigation` 模組並引入對應的 `swiper/css`／`swiper/css/navigation` 樣式
- [x] 2.3 對齊 Requirement「模特可用內建或上傳真人照」新增內容「內建模特庫 SHALL 顯示圖庫裡實際的模特素材縮圖，SHALL NOT 顯示不對應任何真實素材的示意圖示或寫死的假資料」：每張輪播卡片顯示素材的 `url` 縮圖與 `materialName`，取代原本永遠顯示的 `IconImagePlaceholder`
- [x] 2.4 對齊 Requirement「使用者點選內建模特庫裡的一張素材」：點擊素材卡片標記選取狀態（`model` 改存選取素材的 `materialId`），沿用既有 `:aria-pressed`／`isActive` 樣式邏輯
- [x] 2.5 落地設計決策「決策 5：「檢視完整模特庫」文字改成動態筆數，連結行為維持不變（仍然是死的，但不再說謊）」：「檢視完整模特庫」文字改成 `t('tryOn.viewFullLibrary', { count: models.length })`，`src/lang/zh-Hant.ts`／`src/lang/en.ts` 對應調整成帶參數的字串，兩邊 key 結構一致
- [x] 2.6 落地設計決策「失敗模式」記錄的空狀態處理：`api.listMaterials('model')` 回傳空陣列時，顯示「目前沒有內建模特」之類的空狀態文字，不渲染壞掉的 Swiper

## 3. 驗證

- [x] 3.1 對齊 Requirement「使用者瀏覽內建模特庫」——瀏覽器手動驗證（Playwright，真後端帳號 qa_brand_test，本機 mock 模式）：進入 AI 試穿工作台，確認「內建模特庫」分頁顯示真實素材縮圖（不是灰色示意圖示），一次顯示 4 個
- [x] 3.2 瀏覽器手動驗證：點擊左右箭頭或用滑鼠拖曳滑動，確認可以看到第 5 筆之後的素材；確認「檢視完整模特庫」文字顯示的筆數與 mock 資料實際筆數一致
- [x] 3.3 對齊 Requirement「使用者點選內建模特庫裡的一張素材」——瀏覽器手動驗證：點擊某張素材縮圖，確認標記為選取狀態
- [x] 3.4 `npm run lint` 與 `npx vue-tsc --noEmit` 通過
- [x] 3.5 執行 `spectra validate add-tryon-model-swiper --strict` 與 `spectra analyze add-tryon-model-swiper`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 3.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive add-tryon-model-swiper`
