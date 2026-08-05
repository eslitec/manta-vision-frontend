## 1. 文案更新（僅 i18n 文字）

- [x] 1.1 更新首頁副標題文字，對齊設計稿文案（已隨 `remove-i18n` 任務 1.1 一併完成，直接寫死在 `HomeView.vue` 樣板裡，不再是改 `zh-Hant.ts`）
- [x] 1.2 將卡片標題從「圖生影」改成「圖生影片」（已隨 `remove-i18n` 任務 1.1 一併完成，直接寫在 `genTools` 資料裡）
- [x] 1.3 更新頂部工具列角色文字，顯示「擁有者」而不是「管理者」（i18n 已移除，直接改 `DefaultLayout.vue` 樣板字串，不再是改 key）
- [x] 1.4 更新圖庫橫幅說明文字措辭，對齊設計稿
- [x] 1.5 拿掉「品牌設定已完成」開頭的 `✓` 字元（打勾改用圖示呈現，見任務 2.2）

## 2. 側邊欄視覺更新

- [x] 2.1 在 `DefaultLayout.vue` 幫 `.sidebar__item.is-active` 加上左側強調色條（CSS `::before`，不新增 DOM 節點）
- [x] 2.2 把 `HomeView.vue` 裡品牌完成狀態的 `✓` 文字前綴，換成行內 SVG 打勾圖示，由既有的 `brandReady` computed 驅動

## 3. 側邊欄底部連結

- [x] 3.1 在 `DefaultLayout.vue` 的 `.sidebar__nav` 下方加上「教學文件」「登出」兩個項目，做成視覺弱化／未啟用樣式（不用 `router-link`，先不加點擊行為）

## 4. 頂部工具列調整

- [x] 4.1 移除 `DefaultLayout.vue` 裡 `.topbar__right` 的語言 `<select>`（已隨 `remove-i18n` 任務 1.2 一併完成）
- [x] 4.2 移除 `DefaultLayout.vue` `<script setup>` 裡的 `locale`／`SUPPORTED_LOCALES` 相關程式碼（已隨 `remove-i18n` 任務 1.2 一併完成；`en.ts`／`zh-Hant.ts` 和 `vue-i18n` 設定本身則是被整個移除，而非「保持不變」——範圍比原本規劃的大，詳見 `remove-i18n` change）
- [x] 4.3 在 `.topbar__right` 裡、`FeedBadge` 左邊，新增一個純畫面呈現的「任務」按鈕（先不加點擊事件／目標頁面）

## 5. 生成工具卡片圖示

- [x] 5.1 把 `HomeView.vue` 裡 `genTools` 資料的各卡不同底色，換成統一的淺藍色圖示底
- [x] 5.2 在 `HomeView.vue` 的 `.card` 樣板裡固定加上消耗飼料徽章圖示（4 張卡片一致顯示，不用 per-card 旗標控制）

## 6. 驗證

- [x] 6.1 執行 `npm run build`（包含 `vue-tsc` 型別檢查），確認通過
- [x] 6.2 把畫面實際渲染結果，跟 Figma 截圖做視覺比對
