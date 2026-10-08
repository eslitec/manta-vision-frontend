## 1. 型別與 API 層

- [x] 1.1 對齊 Requirement「素材可依來源與關鍵字篩選」：`src/types/asset.ts` 的 `AssetSource` 加 `'builtin'`、`ImageCounts` 加 `builtin`、`Asset` 加選填 `category`（`CategoryTag` 排除 `builtin`）；`src/api/real.ts` 的 `WireImage` 加 `category?: ... | null`，`toAsset` 帶出 `category`（null → undefined）；`src/composables/useAssets.ts` 的 counts 預設值加 `builtin: 0`
- [x] 1.2 落地設計決策「決策 5：mock `listImages` 把內建素材排在使用者素材之後」：`src/api/mock.ts` 新增 `materialAsAsset` 投影，不帶 `source` 時合併 `MATERIALS`、`source=builtin` 只回內建、帶 `folderId` 或 `mediaType=video` 不含內建；`countByBucket` 的 `all`／`builtin`／`object` 含內建
- [x] 1.3 `src/api/real.spec.ts` 補 `source=builtin` query 與 `category` 轉型測試（cp 快照改壞 `toAsset` 會紅、還原後綠）；`src/composables/useAssets.spec.ts` 的 `emptyCounts` 加 `builtin`
- [x] 1.4 對齊 Requirement「素材可依來源與關鍵字篩選」：mock `listImages` 的 `source=object` 另含內建 `category=object` 的素材（與後端、`counts.object` 一致）；`src/api/mock.spec.ts` 補五條鑑別測試（不帶 source 合併且內建在後／`source=builtin` 只回內建／`folderId`、`mediaType=video` 排除／`source=object` 含內建物件／`counts.all`、`builtin`、`object` 口徑），cp 快照後分別改壞「永不合併」「永遠合併」「object 不含內建」「counts.object 不含內建」四種旗標各自會紅、還原後綠

## 2. 圖庫頁

- [x] 2.1 對齊 Requirement「素材可依來源與關鍵字篩選」，落地設計決策「決策 4：來源 chip 與系統分類的衝突處理沿用 `sourceConflictsWithCategory`」：`src/views/LibraryView.vue` 的 `sources` 加 `'builtin'`（排在 `edit` 之後）；i18n `sources.builtin`（zh-Hant「內建素材」／en「Built-in」）
- [x] 2.2 對齊 Requirement「素材清單分頁顯示」，落地設計決策「決策 1：內建素材改由 `GET /images`（#5）回傳、`GET /materials`（#12）只給試穿與編輯器」：刪除 `materials` ref、`mergesMaterials`／`materialsForView`／`pagedMaterials`／`pagedRealAssets`／`showMaterials`、`fetchAllRealAssets`／`REAL_FETCH_PAGE_SIZE`、`onMounted` 的 `listMaterials`；`fetchAssets` 一律 `assets.value = []` 後 `load(buildQuery())`；左側「全部素材」用 `counts.all`、「物件素材」用 `counts.object`、「未分類」用 `unfiledCount`、「共 N 筆」用 `total`。驗證：`grep -n "listMaterials\|fetchAllRealAssets\|materials\b" src/views/LibraryView.vue` 為 0 筆
- [x] 2.3 對齊 Requirement「每個素材卡片顯示型別與來源標籤」，落地設計決策「決策 2：內建素材以來源標籤「內建素材」區分，不再有獨立小標段落」與「決策 3：內建素材 `selectable=false`，批次操作靠「選不到」排除」：移除 `template(v-if="showMaterials")` 小標區塊、`.assets__materialsLabel` 樣式與 `library.builtinMaterials` i18n key；`AssetCard` 加 `:selectable="a.source !== 'builtin'"`；「全選本頁」改用 `selectableAssets`
- [x] 2.4 對齊 Requirement「素材可依來源與關鍵字篩選」，落地設計決策「決策 6：「從圖庫選擇」彈窗在前端過濾掉內建素材」：`src/components/ImagePickerDialog.vue` 的 `filtered` 一律排除 `source === 'builtin'`

## 3. 驗證

- [x] 3.1 `npx vitest run` 0 failed（基準 225 → 226 → 231）；`npx vue-tsc --noEmit`、`npm run lint` exit 0；`npx prettier --check` 改動檔全過；i18n 兩份 key 對齊與基準相同（zh-Hant 多 8 個 `editor.retouch.*`，en 0）
- [x] 3.2 真後端瀏覽器實測（puppeteer-core，:5173，帳號 e2e_crop_0922_4529，實測 2026-09-25：全部 36／內建 32／未分類 4、翻頁只有 `GET /api/images?page=2&pageSize=8` 一發、搜尋「 II」命中 3 筆內建、0 個扣點端點）：「全部」第一頁最新的是使用者自己的圖、內建素材卡片標「內建素材」且沒有 checkbox；「內建素材」chip 只有內建、共 32 筆；左側「全部素材」＝後端 `counts.all`；「未分類」不含內建；搜尋內建素材名稱有命中；翻頁只打一發 `GET /images`
- [x] 3.3 `spectra validate library-builtin-source` 與 `spectra analyze library-builtin-source` 無 Coverage／Consistency／Gaps 發現

## 4. 收尾

- [ ] 4.1 PR 合併並確認畫面驗收無誤後執行 `spectra archive library-builtin-source`
