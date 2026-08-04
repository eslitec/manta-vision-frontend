## 1. 把文字寫死進樣板（同時清掉語言切換器）

- [x] 1.1 把 `HomeView.vue` 裡所有 `{{ $t('xxx') }}` 換成 `zh-Hant.ts` 對應的實際中文字串
- [x] 1.2 把 `DefaultLayout.vue` 裡所有 `{{ $t('xxx') }}` 換成實際中文字串；移除語言 `<select>` 與 `locale`／`SUPPORTED_LOCALES` 相關的 `<script setup>` 程式碼
- [x] 1.3 把 `FeedBadge.vue` 的 `feedBadge.unit`（顆）、`feedBadge.topup`（儲值）兩個 `$t()` 換成內聯中文字串
- [x] 1.4 執行 `npm run build`，確認這 3 個檔案改完後畫面照常，沒有殘留的 `$t(` 呼叫

## 2. 移除 i18n 機制本身

- [x] 2.1 移除 `src/main.ts` 裡 `vue-i18n` 的 import 與 `app.use(i18n)`
- [x] 2.2 刪除整個 `src/lang/` 資料夾（`zh-Hant.ts`、`en.ts`、`index.ts`）
- [x] 2.3 從 `package.json` 移除 `vue-i18n` 依賴並同步更新 `package-lock.json`（`npm uninstall vue-i18n`）

## 3. 驗證

- [x] 3.1 全專案搜尋確認沒有殘留的 `$t(`、`useI18n`、`vue-i18n` 引用
- [x] 3.2 執行 `npm run build`（含 `vue-tsc` 型別檢查），確認通過（主要 JS bundle 從 224.85 kB 降到 157.57 kB，證實 vue-i18n 已從打包產物移除）
- [x] 3.3 視覺確認畫面文字沒有變成空白、跑版，跟改動前顯示內容一致（實際啟動 dev server + 瀏覽器截圖確認）
