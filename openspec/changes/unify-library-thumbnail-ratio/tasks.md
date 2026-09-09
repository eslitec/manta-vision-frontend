## 1. 縮圖比例調整

- [x] 1.1 落地設計決策「決策 1：縮圖框比例統一改為 `1 / 1`（正方形）」：`src/components/AssetCard.vue` 的 `.assetCard__thumb` 的 `aspect-ratio` 從 `244 / 152` 改為 `1 / 1`，維持既有 `width: 100%`
- [x] 1.2 對齊 Requirement「每個素材卡片顯示型別與來源標籤」新增內容：`src/views/LibraryView.vue` 生成中任務佔位卡片（`.asset--pending` 底下的縮圖框）的 `aspect-ratio` 從 `244 / 152` 改為 `1 / 1`，跟真實素材卡片保持一致
- [x] 1.3 對齊 Requirement「批次刪除素材需要明確確認」新增內容：`src/views/LibraryView.vue` 刪除確認彈窗預覽縮圖的 `aspect-ratio` 從 `4 / 3` 改為 `1 / 1`
- [x] 1.4 落地設計決策「決策 2：維持 `object-fit: cover`，不改成 `contain`」：確認上述三處縮圖框都維持既有 `object-fit: cover`，沒有連帶改成 `contain` 或其他裁切方式
- [x] 1.5 落地設計決策「決策 3：範圍限定在圖庫管理中心頁面本身，不含「從圖庫選擇」彈窗」：確認 `src/components/ImagePickerDialog.vue` 的 `aspect-ratio: 159 / 104` 維持不變，沒有被連帶修改

## 2. 骨架屏同步（跨 change 協調）

- [x] 2.1 落地設計決策「決策 4：骨架屏佔位卡片改用 ingest 更新既有 change，不在這個 change 裡重複描述」：對 `openspec/changes/add-library-loading-skeleton` 執行 `/spectra-ingest`，把該 change 的骨架屏佔位卡片（`.assetSkeleton__thumb`）尺寸從對齊 Figma `1309:7676` 的 `15.25rem × 9.5rem` 改為正方形（寬高相等），並在該 change 自己的 design.md／spec.md 記錄「老闆的正方形要求覆蓋原本的 Figma 靜態稿比例」這個異動理由
- [x] 2.2 依 ingest 後的 `add-library-loading-skeleton` tasks，實作 `.assetSkeleton__thumb` 的正方形尺寸調整（`src/views/LibraryView.vue`），確認骨架屏卡片跟載入完成後的正方形素材卡片外觀尺寸一致，不會有載入中／載入完成兩種比例造成的畫面跳動

## 3. 驗證

- [x] 3.1 `npm run lint` 通過
- [x] 3.2 `npx vue-tsc --noEmit` 通過
- [x] 3.3 瀏覽器手動驗證（Playwright，真後端帳號 qa_brand_test）：對齊 Requirement「不同原生比例的素材縮圖呈現一致的框架比例」——`getComputedStyle` 實測 `/library` 主格線的 `.assetCard__thumb`：`width: 244px`、`height: 244px`、`aspectRatio: 1 / 1`，確認正方形生效
- [x] 3.4 對齊 Requirement「刪除確認彈窗的縮圖預覽跟主清單比例一致」——原始碼層級確認 `.modal__previewThumb` 的 `aspect-ratio` 已改為 `1 / 1`；這個測試帳號（qa_brand_test）目前圖庫前幾頁清一色是不可選取的內建素材（材料筆數剛好鋪滿分頁），沒有可勾選的真實素材可以實際觸發刪除確認彈窗做 DOM 層級驗證，改以程式碼比對確認：`.modal__previewThumb` 與已經實測驗證過的 `.assetCard__thumb` 套用同一個 `aspect-ratio: 1 / 1` 數值、同樣是純 CSS 靜態屬性，不受內容或資料影響，可視為等效驗證
- [x] 3.5 瀏覽器手動驗證：骨架屏載入狀態（觸發切換分類重新查詢）的 `.assetSkeleton__thumb` 實測 `width: 244px`、`height: 244px`，與 `.assetCard__thumb` 一致；`.assetSkeleton` 外層卡片尺寸 252×300.6px 與實際 `.assetCard` 卡片 252×306.6px 相差僅 6px（文字行高造成的正常誤差），無明顯版面跳動。這個帳號目前沒有進行中的生成任務，`.pending` 佔位卡片（生成中任務）的正方形調整已在原始碼確認（`aspect-ratio: 1 / 1`），但沒有進行中任務可供即時 DOM 驗證
- [x] 3.6 執行 `spectra validate unify-library-thumbnail-ratio --strict` 與 `spectra analyze unify-library-thumbnail-ratio`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 3.7 PR 合併並確認畫面驗收無誤後執行 `spectra archive unify-library-thumbnail-ratio`
