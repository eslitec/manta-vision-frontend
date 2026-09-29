## 1. 純邏輯與 API 層

- [x] 1.1 依設計決策 4「篩選或搜尋會藏住新圖時切回「全部」並清空搜尋」與設計決策 5「格式與大小由 API 層判斷，accept 取自既有常數」：新增 `src/utils/imagePicker.ts` 的 `isListedInPicker`（由 `ImagePickerDialog` 的 `filtered` 抽出，規則不變）與 `uploadErrorMessage`，`src/utils/imagePicker.spec.ts` 補 7 條測試；驗證：`npx vitest run src/utils/imagePicker.spec.ts` 7 passed，把 `uploadErrorMessage` 的大小／格式分支對調後 2 failed（改壞會紅），還原後再綠
- [x] 1.2 依設計決策 6「mock 一般上傳也回傳 object URL」與設計決策 5：`src/api/mock.ts` 匯出 `SUPPORTED_UPLOAD_FORMATS`，一般上傳也回 `URL.createObjectURL(file)`；`src/api/mock.spec.ts` 一般上傳補 `url` 為 `blob:` 的斷言（68 passed）

## 2. 選圖彈窗

- [x] 2.1 對齊 Requirement「素材挑選彈窗可直接上傳圖片」、依設計決策 1「上傳入口只寫在 ImagePickerDialog，六個使用處零改動」與設計決策 2「上傳走 useAssets().upload，只有物件模式帶 source=object」：`src/components/ImagePickerDialog.vue` 格線第一格加 `button.pick.pick--upload`（虛線框＋`IconAddObject`＋文字、`aria-label`、`aria-busy`／`aria-disabled`）、格線外的 `hidden` 檔案輸入、`.picker__modal` 的拖放、上傳中確認鈕停用；`src/lang/zh-Hant.ts`／`src/lang/en.ts` 同步新增 `imagePicker.upload`、`imagePicker.uploading`、`imagePicker.uploadLabel`
- [x] 2.2 對齊 Requirement「素材挑選彈窗上傳成功後新圖置頂並自動選取」、依設計決策 3「新圖以本地插入置頂，不重打 GET /images」與設計決策 4：成功後 `assets.value.unshift`、依 `multiple` 選取，新圖被篩選或搜尋藏住時切回「全部」並清空搜尋
- [x] 2.3 對齊 Requirement「素材挑選彈窗上傳失敗時顯示錯誤且不新增項目」：失敗時 `p.picker__error(role="alert")` 顯示 `uploadErrorMessage`，清單與選取不變；檔案輸入每次清空 `value` 以便重試；重新開啟或下一次上傳時清除錯誤

## 3. 驗證

- [x] 3.1 `npx vitest run` 263 passed（基準 256 ＋ 本次 7）、`npx vue-tsc --noEmit` exit 0、`npm run lint` exit 0、`npx prettier --check` 改動檔全過；i18n 兩語系 key 差異與基準相同（zh-Hant 多 8 個既有 `editor.retouch.*`，en 多 0），新增 key 兩邊都有
- [x] 3.2 對齊 Requirement「素材挑選彈窗可直接上傳圖片」、Requirement「素材挑選彈窗上傳成功後新圖置頂並自動選取」、Requirement「素材挑選彈窗上傳失敗時顯示錯誤且不新增項目」：mock 冒煙（puppeteer-core 無頭 Chrome、真滑鼠事件、`elementHandle.uploadFile`）六個使用處各驗上傳卡片為第一格、上傳後置頂且被選取、確認後呼叫端拿到它；另驗 AI 生成篩選下上傳看得見、超過大小與不支援格式出現 alert 且不新增、鍵盤 Enter 開檔案選擇。另含 6 項既有行為回歸（三顆篩選、asset 模式不列內建、搜尋、關閉重開重置、物件模式無篩選列且列內建、試穿不列模特照）。先讓它紅：同一腳本在基準版本 b733343 的非 git 複本 34 項中 28 項 FAIL（新功能全紅、6 項回歸全綠），改後 34/34 PASS（連跑 4 次皆 34/34）
- [x] 3.3 對齊 Requirement「素材挑選彈窗可直接上傳圖片」：真後端冒煙（5179 被另一個 worktree 的 dev server 佔用，改用 `vite --port 5185 --strictPort`、後端 :8000），新註冊的測試帳號從「生成圖片」選參考圖彈窗上傳 PNG → 參考圖顯示該圖、`GET /images` 看得到且 `source=upload`；從編輯器「加入物件」彈窗上傳 → `GET /images?source=object` 看得到、畫布新增物件圖層；不呼叫任何生成端點——7/7 PASS，非 GET 請求只有 `POST /api/auth/*` 與兩次 `POST /api/upload`，`GET /feeds` 餘額前後相同
- [x] 3.4 `spectra validate picker-direct-upload` valid、`spectra analyze picker-direct-upload` Coverage／Consistency／Gaps 皆 Clean（在不含 git 的複本上跑；spectra 3.0.0 的 validate 沒有 `--strict` 旗標）
- [x] 3.6 對齊 Requirement「素材挑選彈窗上傳成功後新圖置頂並自動選取」（審查後續）：上傳中關閉彈窗、上傳完成前重開時，重開的 `GET /images` 可能已帶到新圖，插入前以 `id` 去重，避免同一張出現兩筆；審查者的 `rv_extra.cjs` 第 7 項改前 FAIL（出現 2 筆）、改後 PASS（1 筆），其餘 9 項維持 PASS；`vue-tsc`、`lint`、prettier 皆過
- [x] 3.7 對齊 Requirement「素材挑選彈窗可直接上傳圖片」（使用者回報上傳卡片變形）：`.picker__grid` 由 `repeat(4, 1fr)` 改為 `repeat(4, minmax(0, 1fr))`——`1fr` 的下限是內容寬，真後端圖片原始寬 640～1024px 會把欄撐開、格線橫向溢出、上傳卡片被擠窄（mock 圖小所以先前冒煙沒抓到）。驗證：真後端探針 `pickgrid/probe.cjs`（1440／1000 寬，全部素材與只剩 1 張兩種情境）改前各格寬 146／197 不一致且格線 828 > 672 溢出，改後每格 159 × 104、無溢出；mock 冒煙 34/34；`vue-tsc`／`lint`／prettier 通過
- [ ] 3.5 PR 合併並確認畫面驗收無誤後執行 `spectra archive picker-direct-upload`
