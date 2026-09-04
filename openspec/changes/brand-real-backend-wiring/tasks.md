## 1. 型別與假後端同步

- [x] 1.1 `BrandProfile` 新增 `portraitConsent`／`imageLicense` 兩個必填欄位
- [x] 1.2 `mock.ts` 的 `db.brand` 補上這兩個欄位（沿用 `zh-Hant.ts` 的預設文案，保持假／真
      後端初始畫面一致）
- [x] 1.3 `mock.ts` 的 `saveBrand()` 回傳型別改成 `Promise<BrandProfile>`（回傳存檔後的
      complete 內容），維持跟 `real.ts` 介面一致

## 2. 真後端串接（real.ts）

- [x] 2.1 `WireBrand`／`WireColorPalette` 型別對照 `docs/api-status.md` §7 的完整欄位
- [x] 2.2 `toBrand()`：null／空殼欄位正規化成空字串／空陣列；`colorPalette` 依
      `primary`／`secondary`／`accent` 三個具名欄位拆回陣列；`avoidWords` 陣列 join 回單一
      字串；Logo 檔名用網址最後一段猜測（後端不回檔名）
- [x] 2.3 `saveBrand()`：`avoidWords` 字串 split 回陣列；`colors` 固定用前 3 個索引對應三個
      具名欄位（第 4 個以後不落地，屬 proposal.md 記錄的已知限制）；`website`／
      `customerAddress`／`portraitConsentTemplate`／`imageLicense` 空字串一律送 `null`
      （三態語意的「明確清空」，不是「不動」——用空字串會被後端當成 no-op，使用者清空欄位
      的操作會悄悄失效）
- [x] 2.4 Logo 兩段式上傳：`logoUrl` 是 `data:` URL 時，先呼叫既有的 `uploadImage()` 拿
      `imageId` 再送 `logoImageId`；`logoUrl` 是空字串時送 `logoImageId: null`（清空）；
      `logoUrl` 已經是後端網址（沒換過）時不帶這個 key（三態的「不動」）
- [x] 2.5 `getBrand()`／`saveBrand()` 加入 `realApi` 匯出物件

## 3. Store 與畫面

- [x] 3.1 `stores/brand.ts` 的 `load()`：合規欄位若為空，補上跟畫面一致的 i18n 預設文案
      （`i18n.global.t()`，precedent 見 `router/index.ts` 對 `document.title` 的用法）
- [x] 3.2 `stores/brand.ts` 的 `save()`：改成 `profile.value = await api.saveBrand(profile.value)`，
      修正「Logo 換成真正網址後，下一次存檔會因為沿用本地舊值而重複上傳」的問題
- [x] 3.3 `BrandSettingsView.vue`：合規頁兩個 textarea 改綁 `profile.portraitConsent`／
      `profile.imageLicense`，移除原本孤立、從不存檔的本地 `ref`

## 4. 測試與驗證

- [x] 4.1 `real.spec.ts` 新增「品牌設定（brand）」：GET 正常映射、GET null 正規化、PUT 欄位
      映射（avoidWords／colorPalette）、PUT 三態語意（空字串送 null）、Logo 三種情境
      （新上傳／清空／不動）、`saveBrand()` 回傳值驗證
- [x] 4.2 `stores.spec.ts` 更新「save 期間切換 saving 狀態」測試，驗證 `saveBrand()` 的
      回傳值會覆蓋本地 `profile`
- [x] 4.3 `npx vue-tsc --noEmit` 通過（使用者自己的機器上執行，雲端環境沒有這個專案的
      `node_modules`）
- [x] 4.4 `npx vitest run src/api/real.spec.ts src/stores/stores.spec.ts` 41 個測試全過；
      `stores.spec.ts` 單獨執行 18 個測試全過（含串接過程中一度誤用舊版檔案內容、已修正
      還原的 session store 既有測試）
- [ ] 4.5 `npx eslint` 在使用者機器上因故執行超過 3 分鐘未完成（疑似環境問題，`vue-tsc`／
      `vitest` 在同一台機器上都能正常跑完），這次沒能拿到 lint 結果，建議你自己找時間跑一次
      `npm run lint` 確認格式與既有規則沒有問題
- [x] 4.6 `git diff --cached` 逐檔覆核，確認沒有意外覆蓋掉分支上其他未讀到的既有變更
      （曾經在覆核時發現 `stores.spec.ts` 的編輯是基於過時的暫存內容，已用
      `git show HEAD:...` 還原成當下真正的內容後重做該筆測試異動，過程記錄見本檔第 4.4 項）

## 5. Spectra 文件

- [x] 5.1 更新 `openspec/specs/brand-settings-ui/spec.md`「提供合規與授權資訊」Requirement，
      補上「填寫內容會被存檔」的行為說明與新 Scenario
- [x] 5.2 四個 Requirement 的 `@trace` code 清單加上 `src/api/real.ts`，`updated` 日期更新
- [ ] 5.3 使用者自行執行 `spectra validate brand-real-backend-wiring --strict` 與
      `spectra analyze brand-real-backend-wiring`（雲端環境沒有安裝 Spectra CLI）
- [ ] 5.4 待 PR 合併後再 `archive`（比照 repo 既有慣例）
