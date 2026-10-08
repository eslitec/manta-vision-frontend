## 1. API 層（types、errors、real.ts、mock.ts、useAssets、spec）

- [x] 1.1 對齊 Requirement「試穿生成走真後端」，落實設計決策「202 輪詢與冪等鍵沿用 runGeneration」：`src/types/api.ts` 的 `TryOnReq` 改成 `{ modelSource: 'material' | 'upload', modelRefId, clothImageId }`；`src/api/errors.ts` 加 `CONSENT_REQUIRED`；`src/api/real.ts` 新增 `tryOn(req)`（`runGeneration('/tryon', req)` → `results[0]` 經 `toGeneratedImage`，沒有結果丟 `UNEXPECTED_RESPONSE`）並加入 `realApi`。驗證：`real.spec.ts`「200：打 /tryon…」「202 → 輪詢…」「403 CONSENT_REQUIRED…不重送」三條全綠
- [x] 1.2 對齊 Requirement「肖像同意讀寫後端」的 API 部分：`real.ts` 新增 `getConsent()`（`GET /users/me/consent` → `{ consented: portraitConsent }`）、`giveConsent()`（`PUT /users/me/consent` body `{ consent: true }`）並加入 `realApi`（`src/stores/consent.ts` 的改動見 4.1）。驗證：「getConsent 打 GET…」「giveConsent 打 PUT…」兩條全綠；「已接上的方法不是 mock 的那一份」多 `tryOn`／`getConsent`／`giveConsent` 三行
- [x] 1.3 對齊 Requirement「模特照持久化」的 API 部分：`src/types/asset.ts` 的 `AssetSource` 加 `'tryonModel'`、新增 `UploadSource`；`real.ts`／`mock.ts` 的 `uploadImage` 加第 5 個選填參數 `source`（有帶才 `form.append('source', …)`；mock 標成該來源、`countByBucket` 把 `tryonModel` 算進 `upload`）；`useAssets.upload` 轉發。驗證：`real.spec.ts`「uploadImage 帶 source=tryonModel…」與既有三條 `uploadImage` 測試全綠（不帶時 `form.get('source')` 為 `null`）；`useAssets.spec.ts`「upload 把 source 原樣轉給 uploadImage」全綠；`mock.spec.ts`「uploadImage 帶 source=tryonModel…」全綠
- [x] 1.4 對齊 Requirement「結果可存入圖庫／下載／重新生成」的 API 部分：`real.ts`／`mock.ts`／`useAssets.ts` 的 `saveGenerated(name, from)` 改 `from` 必填，刪掉 real 版落 mock 的過渡分支；`mock.ts` 的 `MOCK_MODELS` 加 `tryonStandard`（12）、`tryOn(req)` 扣 12 回帶圖的 `GeneratedImage`。驗證：`real.spec.ts` 刪掉「沒帶 from 時不打網路」、新增「saveGenerated 對試穿結果也走同一支 /save」全綠；`mock.spec.ts`「tryOn 扣 tryonStandard 的 12 顆…」全綠

## 2. 試穿頁（TryOnView、i18n）

- [x] 2.1 對齊 Requirement「肖像同意讀寫後端」的畫面部分，落實設計決策「同意：後端為真相，403 時本機狀態回退」：掛載時 `consentStore.load()`＋`brand.load()`；同意視窗 `.terms` 改顯示 `consentTemplate`（brand `portraitConsent` 或 i18n 預設，`white-space: pre-line`）；拿掉 `cdialog__pdf` 按鈕與 `downloadTerms`；`onGenerate` 遇 403 `CONSENT_REQUIRED` 把 `consented` 設回 `false` 並開視窗。驗證：mock 冒煙「同意流程」通過；真後端頁面載入有 `GET /users/me/consent`
- [x] 2.2 對齊 Requirement「模特照持久化」與 Requirement「模特可用內建或上傳真人照」的畫面部分，落實設計決策「模特照持久化：source=tryonModel」：`onModelUpload` 帶 `'tryonModel'`、成功後 push 並自動選中；掛載時 `api.listImages({ source: 'tryonModel', pageSize: 20 })` 回填；清單顯示 n／`MODEL_PHOTO_LIMIT`；列改成 `button.uprow__pick`（`aria-pressed`＋`isActive`）可點選；拿掉 `statuspill`、`uprow__note`、示範列、`useRealBackend`；上傳失敗的其他錯誤改 `displayMessage`。驗證：mock 冒煙「上傳模特照進清單並可選」通過；真後端頁面載入有 `GET /images?source=tryonModel`（17 張）、上傳一張 201 後清單 +1
- [x] 2.3 對齊 Requirement「試穿生成走真後端」與 Requirement「生成前需完成肖像同意」的畫面部分，落實設計決策「modelRefId 的來源與選取狀態」：`modelRef` computed 依分頁決定 `modelSource`／`modelRefId`；`canGenerate`（非生成中、價格已載、有模特、有衣服）控制生成鈕與「重新生成」；`onGenerate` 呼叫 `api.tryOn({ ...modelRef, clothImageId })`，結果存 `result`；`onBeforeRouteLeave`＋`beforeunload` 離開確認；`finally` 刷新 `feed`。驗證：mock 冒煙「選內建模特＋服飾 → 試穿 → 結果出現圖片…餘額扣 12」通過
- [x] 2.4 對齊 Requirement「結果可存入圖庫／下載／重新生成」與 Requirement「首次進入與生成完成狀態分離」的畫面部分：結果區 `img.result__img`（`object-fit: contain`）／無結果顯示 `IconPlayCircle`；`saveResult` 帶 `result`（`ALREADY_SAVED` 當已存入）；`download` 走 `downloadFile` 並送 `recordAdoption`；`tryOn.resultHint` 改 24 小時提示。驗證：mock 冒煙結果區出現 `img.result__img` 與「存入圖庫／下載」按鈕、按存入後變「已存入」
- [x] 2.5 對齊 Requirement「顯示飼料消耗」（取代 Requirement「顯示品牌設定開關與飼料消耗」），落實設計決策「價格與採用事件」：拿掉 `BrandToggle`／`applyBrand`／`goBrandSettings`／`.tryon__brand`；估價改讀 `api.listModels('tryon')` 第一列 `costFeeds`，未載入顯示「…」且生成鈕停用。驗證：mock 冒煙估價顯示 12；真後端頁面載入有 `GET /ai-models?modelType=tryon`
- [x] 2.6 i18n 兩語系同步：新增 `sources.tryonModel`；改 `tryOn.resultHint`、`tryOn.terms.intro`；刪 `tryOn.upload.available`／`reupload`／`notes.*`、`tryOn.demoModels`、`tryOn.generated`、`tryOn.terms.items`／`more`／`download`。驗證：design.md 的 i18n 對齊檢查結果等於基準（zh-Hant 獨有 8 個 `editor.retouch.*`、en 獨有 0）；`grep -rn "sources.tryonModel"` 兩語系各 1 筆

## 3. 驗證

- [x] 3.1 `npx vitest run` 0 failed（基準 238）；`npx vue-tsc --noEmit`、`npm run lint` exit 0；`npx prettier --check` 改動檔通過
- [x] 3.2 先讓它紅：`cp src/api/real.ts` 到 scratchpad `snap/`，把 `tryOn` 的 URL 改成 `/generate` → 「200：打 /tryon」必須紅；把 `giveConsent` 的 body 改成 `{ consent: false }` → 「giveConsent 打 PUT」必須紅；`uploadImage` 不 append `source` → 「uploadImage 帶 source=tryonModel」必須紅；每項用 `cp` 還原後全綠
- [x] 3.3 `spectra validate tryon-real-backend`、`spectra analyze tryon-real-backend`：valid 且 Coverage／Consistency／Gaps 無發現
- [x] 3.4 mock 冒煙（`VITE_USE_MOCK= npx vite --port 5174 --strictPort`，puppeteer-core＋系統 Chrome headless，`browser.close()` 在 `finally`）：同意流程、上傳模特照進清單並可選、選內建模特＋服飾 → 試穿 → 結果出現圖片與存入／下載按鈕、餘額扣 12；截圖在 scratchpad `tryon-ui/`
- [x] 3.5 真後端（免費部分）冒煙：先 `DELETE /images/{id}` 刪 3 張模特照；頁面載入看到 `GET /users/me/consent`、`GET /images?source=tryonModel`（17 張）、`GET /ai-models?modelType=tryon`（估價 12）；上傳一張模特照 201 且清單 +1；不按試穿
- [ ] 3.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive tryon-real-backend`（先歸檔 `tryon-model-upload-real-backend`，本 change 的「模特照持久化」覆蓋其「不帶 source」的敘述）

## 4. 審查修正

- [x] 4.1 對齊 Requirement「肖像同意讀寫後端」，落實設計決策「同意：後端為真相，403 時本機狀態回退」的補充：`src/stores/consent.ts` 加 `$reset()`、進行中請求共用一發、`give()` 已同意不重打；`src/stores/session.ts` `discard()` 呼叫 `consent.$reset()`；`TryOnView.vue` 頂部提示改 `consentLoaded && !consented`、`onModelUpload`／`onGenerate` 先 `await consentStore.load()`、`acknowledge()` try/catch 把錯誤顯示在視窗內 `consentErr`、`closeConsent()` 重設 `ackChecked`。驗證：`stores.spec.ts`「登出清掉肖像同意狀態」「已同意時 give 不重打 PUT」「並行的 load 共用同一發」「reset 之後才回來的舊回應不採用」全綠；先讓它紅：拿掉 `consent.$reset()` → 第一條紅、拿掉 `give()` 的守衛 → 第二條紅
- [x] 4.2 對齊 Requirement「顯示飼料消耗」：`GET /ai-models?modelType=tryon` 回空清單時 `errorMsg = t('errors.loadFailed')`。驗證：vue-tsc／lint 通過（無獨立測試：view 層無測試框架）
- [x] 4.3 落實設計決策「服飾選擇不列模特照」：`ImagePickerDialog` 加 `excludeSources` prop（預設空），試穿頁帶 `['tryonModel']`。驗證：vue-tsc 通過；其他四個呼叫端不帶＝行為不變
- [x] 4.4 落實設計決策「價格與採用事件」修正：`mock.ts` 的 `tryOn` 不再 `imageGenerations.add`；design.md 採用率敘述改正；`TryOnView.vue` 下載處註解同步。驗證：`mock.spec.ts`「試穿結果的存入／下載不算採用」全綠；先讓它紅：加回 `imageGenerations.add` → 紅
- [x] 4.5 補測試：`real.spec.ts`「200 但 results[] 是空的：丟 UNEXPECTED_RESPONSE」。先讓它紅：`real.ts` 的 `if (!r)` 改 `if (!r && false)` → 紅
- [x] 4.6 `src/api/index.ts` 的 `useRealBackend` 取消匯出並改註解（唯一消費者已在 2.2 拿掉）。驗證：`grep -rn useRealBackend src/` 只剩 index.ts 兩行
- [x] 4.7 落實設計決策「「重新生成」用目前選取的模特與服飾」：不改程式（`onGenerate` 沿用），spec「結果可存入圖庫／下載／重新生成」的敘述改成「以目前選取的模特與服飾」對齊圖生圖頁。驗證：`spectra analyze` Consistency 無發現
