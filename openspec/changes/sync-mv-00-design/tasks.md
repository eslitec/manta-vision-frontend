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

## 7. 圖示與品牌區塊補強（第一輪驗收後，比對更細的設計稿截圖發現的落差）

- [x] 7.1 卡片圖示（`圖生圖`／`AI 產生行銷 PO 文`／`圖生影片`／`AI 試穿衣服`）從 emoji 換成 `@tabler/icons-webfont`（跟專案其他 8 個畫面既有的 `i.ti.ti-*` 慣例一致，後續在任務 8.6 被使用者提供的精確 SVG 素材取代）
- [x] 7.2 側邊欄導覽圖示（`AI 生成工作台`／`圖庫管理中心`／`飼料用量`／`設定`）同樣從 emoji 換成 `i.ti.ti-*`（後續在任務 8.4 被使用者提供的精確 SVG 素材取代）
- [x] 7.3 消耗飼料徽章從純文字「AI」換成設計稿提供的實際 SVG 插圖（帶「AI」字樣的瓶子圖形）
- [x] 7.4 側邊欄品牌區塊（「日安選物／Manta Vision」）加上跟使用中導覽項目一致的反白＋左側強調色條樣式
- [x] 7.5 狀態列（`AI 飼料餘額`／`本月已生成`／`品牌設定`）之間的分隔線改用 `::before` 偽元素實作在 `.stats__item:not(:first-child)` 上，移除獨立的 `.stats__divider` DOM 節點，間距改用 flex `gap`
- [x] 7.6 修正 `$blue-dark-300`（`_variables.scss`）色碼：原本是 `#171E52`，比對設計稿實際用色 `#2E3567` 後修正——這是全站基礎文字色（`body { color: $blue-dark-300 }`），只改變數定義本身，不用逐一改 14 個檔案的用法
- [x] 7.7 修正 `.stats` 的間距寫法：`gap` 誤把「項目 3 → 儲值飼料按鈕」之間也算進去，擠壓項目寬度導致文字換行；改成只在 `.stats__item:not(:first-child)` 用 `margin-left: 48px`。同時確認畫面版面假設桌機寬螢幕（≥1440px），窄視窗換行是預期內、不特別做響應式
- [x] 7.8 修正 `.sidebar` 寬度：`240px` → `200px`（用 Figma Inspect 量到的精確值）
- [x] 7.9 修正 `.sidebar__item.is-active` 的反白背景，改成貼齊側邊欄左右邊緣（`margin: 0 -14px` 抵銷父層 padding，`padding` 補回等量），對齊設計稿標註的「200 Fill」；強調色條 `::before` 的 `left` 從 `-14px` 改成 `0`

## 8. 精確數值比對（使用者透過 Figma Inspect 逐一提供，持續進行中，本節會隨進度增補）

- [x] 8.1 「日安選物」文字：`font-size 15px→16px`、補上 `font-weight: 700`、`line-height` 改用比例 `1.375`（= 22px ÷ 16px，不寫死 px，字級調整時行高自動跟著縮放）
- [x] 8.2 `.sidebar__brand`（品牌區塊）反白背景改成貼齊側邊欄左右邊緣，做法跟任務 7.9 的使用中導覽項目相同（`margin: 0 -16px` 抵銷父層 padding、`padding` 補回等量、`::before` 的 `left` 改成 `0`）
- [x] 8.3 「Manta Vision」文字：補上 `font-weight: 400`、`line-height` 改用比例 `1.4286`（= 20px ÷ 14px）、顏色從 `$gray-400`（#606472）改成設計稿精確色碼 `#606692`（兩者非常接近但不是同一個色號）
- [x] 8.4 側邊欄 4 個導覽圖示換成使用者提供的精確 SVG 素材（多色、多路徑，無法用圖示字型表示），新增 `src/components/icons/`（`IconAiSparkle`、`IconLibraryPhoto`、`IconFeedBottleSmall`、`IconSettings`）4 個小型元件，樣板改用 `<component :is="item.icon">` 動態渲染
- [x] 8.5 側邊欄強調色條（`.sidebar__brand::before`、`.sidebar__item.is-active::before`）從貼滿整個區塊高度（`top:0;bottom:0`），改成跟文字/圖示等高、垂直居中（`top:50%; transform: translateY(-50%); height:20px`）
- [x] 8.6 首頁 5 個卡片圖示（`圖生圖`／`AI 產生行銷 PO 文`／`圖生影片`／`AI 試穿衣服`／`圖庫管理中心`）換成使用者提供的精確 SVG 素材，新增對應的 5 個 `src/components/icons/` 元件；這些 SVG 自帶圓角背景色（`rect rx="8" fill="#EFF2FA"`，剛好等於 `$blue-light`），因此移除 `.card__icon` 原本額外補上的 `background`／`border-radius`／`color`／`font-size`（不再需要，SVG 已自帶）
- [x] 8.7 修正側邊欄圖示看起來偏高的問題：SVG 預設是行內元素、照文字基線對齊，基線下方會留描述符（descender）空間；`.sidebar__item-icon` 改成 flex 容器並讓內部 `svg { display: block }`，脫離行內基線邏輯，圖示才會真正跟文字置中對齊
- [x] 8.8 頂部工具列「任務」按鈕的圖示從文字字元 `▶` 換成使用者提供的精確 SVG 三角形，新增 `IconPlayTriangle` 元件；原始 SVG 的 `fill="white"` 改成 `fill="currentColor"`（按鈕底色是淺藍、文字是深藍，字面白色在這個背景上幾乎看不見，改用跟隨文字色，已跟使用者說明這個判斷、等待確認）——**後續作廢，見任務 8.10**：那個三角形只有 6×7px，太小幾乎看不見，使用者改提供完整的 20×20 帶底色徽章圖示
- [x] 8.9 排查「圖庫管理中心」圖示回報沒顯示的問題：比對程式碼、元件內容、編譯產物（`grep` 確認圖示路徑資料確實在 build 出來的 JS 裡）、實際啟動瀏覽器截圖，三方都確認圖示正常渲染——判定是使用者端瀏覽器快取到舊畫面，不是程式碼問題，沒有修改任何程式碼
- [x] 8.10 頂部「任務」按鈕圖示換成使用者提供的完整 20×20 素材（帶 `#A5C8E6` 底色圓角方塊＋白色播放三角），新增 `IconTasksBadge` 元件取代任務 8.8 的 `IconPlayTriangle`；`IconPlayTriangle.vue` 確認無其他引用後刪除，不留孤兒檔案
- [x] 8.11 「儲值飼料」按鈕元件化：新增 `TopupButton.vue`（`src/components/`），套用 Figma 量到的精確規格（Hug 寬高、`padding: 9px 14px`、`border-radius: 16px`、`gap: 6px`、底色 `#EA903A` 剛好等於既有 `$orange`、陰影剛好等於既有 `$btnBoxShadow`）；`HomeView.vue` 的 `.stats__topup` 換成這個元件，用 `:deep(.secondary-btn) { align-self: center }` 讓它在 `.stats` 這個 flex 容器裡維持置中、不被拉伸
- [x] 8.12 確認 `FeedBadge.vue`（頂部「儲值」按鈕）也要套用同一份規格，改用 `TopupButton`（透過 `slot` 傳入不同文字：「＋ 儲值飼料」／「儲值」），移除各自原本寫死的 `&__topup` CSS，統一由元件管理樣式
- [x] 8.13 `TopupButton` 補上 hover（`#FFB670`）與 active／按下（`#C97722`）兩個互動狀態的背景色，新增對應的 `$orange-light`／`$orange-dark` 變數；因為兩處使用都共用同一個元件，這次補上的互動效果自動套用到兩個按鈕，不用個別處理
- [x] 8.14 `FeedBadge.vue`（頂部「1,240 顆」徽章）的圖示從 emoji `🪙` 換成使用者提供的 SVG——比對路徑後發現跟任務 8.4 已經建立的 `IconFeedBottleSmall` 幾乎完全一致（只有小數點幾位的四捨五入差異），直接重用既有元件，沒有新增檔案
- [x] 8.15 「前往圖庫」按鈕元件化：新增 `OutlineButton.vue`（`src/components/`），套用 Figma 量到的精確規格（Hug 88×36、`padding: 9px 16px`、`border-radius: 18px`、1px 邊框、底色 `#FFFFFF`、邊框/文字色 `#2E3567`、陰影 `$btnBoxShadow`）；因為這顆按鈕包在 `router-link.card--wide`（整張卡片本身就是連結）裡面，做成固定 `<button>` 會變成「連結包按鈕」的不合法巢狀，所以元件加上 `tag` prop（預設 `'button'`），這裡改用 `OutlineButton(tag="span")` 渲染成 `<span>`；已用瀏覽器實際渲染確認輸出是合法的 `<span class="outline-btn">` 而不是巢狀 `<button>`
- [x] 8.16 `.stats` 區塊兩個圖示更新：「AI 飼料餘額」數字前補上瓶子圖示（重用任務 8.4／8.14 已建立的 `IconFeedBottleSmall`，SVG 路徑比對後確認一致，沒有新增檔案）；「品牌設定已完成」原本用 `currentColor` 描邊畫的打勾圖示，換成使用者提供的實心綠色圓底＋白色勾勾 SVG（顏色已內建在路徑的 `fill` 裡，不再需要 `currentColor`）
- [x] 8.17 修正 `.stats__item` 分隔線：原本 `top:0;bottom:0` 貼滿整個項目的伸展高度（`.stats` 用 `align-items: stretch`，讓「本月已生成」「品牌設定已完成」這兩個內容較短的項目也被拉成跟「AI 飼料餘額」一樣高），分隔線因此比自己的文字內容長一截；改成 `top:50%; transform: translateY(-50%)` 置中，`height` 改成貼合各自文字區塊的實際量測高度（數字＋標籤兩行約 52px；「品牌設定已完成」／「品牌設定待完成」只有單行、無獨立標籤，約 23px，用 `:has(.is-ok, .is-muted)` 判斷套用較短的高度）
- [x] 8.18 `HomeView.vue` 剩下的兩處行內 SVG（「品牌設定已完成」打勾圖示、卡片右上角消耗飼料徽章）改成獨立元件：新增 `IconCheckCircle.vue`、`IconFeedBottleBadge.vue`（`src/components/icons/`），樣板改用元件標籤，全站圖示統一走「獨立元件＋動態渲染／直接引用」的模式，不再有寫在畫面樣板裡的行內 `svg`／`path`
- [x] 8.19 「1,240 顆」「128 張」的單位字（`<small>`）從跟數字垂直置中，改成貼齊數字底部：`.stats__num small` 加上 `align-self: flex-end`，只調整單位字自己的對齊方式，不影響同一行內飼料瓶圖示（`.stats__num-icon`）原本的置中對齊
- [x] 8.20 重新核對 `$blue-dark-300`：使用者用 Figma Inspect 再次核對後確認正確色碼是 `#171E52`，取代任務 7.6（commit `ba2869a`）當時認定的 `#2E3567`——那次的比對結果才是錯的，這次修正回來
- [x] 8.21 MV-00 這輪視覺校對收尾，後續若有新一輪落差再繼續增補本節任務
- [x] 8.22 使用者回報「儲值飼料」／「儲值」按鈕（`TopupButton`）點擊時會位移。排查發現是使用者自己先前在 `&:active` 加的金色外框效果（`box-shadow: 0 0 0 3px #f2bb00`）實作方式有誤：連同 `position: absolute` 一起加了進去，導致按鈕在按下的瞬間脫離所在的 flex 容器（`.stats`／`.topbar__right`）的正常排版流程，鬆開時再跳回來，造成視覺上的位移；跟同一批「使用者回報 MV-01 儲存／刪除按鈕位移」是兩個不同成因（那個是全站 Firefox 的 `-moz-focus-inner` 問題），這個是單一元件自己的 CSS 寫法問題。修法：拿掉 `&:active` 裡的 `position: absolute;`，維持跟其他狀態一致的 `position: relative;`，金色外框效果本身（`box-shadow`）不需要 `position: absolute` 才能生效，拿掉後效果不變、只是不再脫離排版流程
- [x] 8.23 `OutlineButton`（`--danger` 變體）的 `:focus` 狀態也曾加上同一種金色外框效果，同樣誤帶了 `position: absolute`；使用者依同一個修法自行拿掉，跟任務 8.22 是同一類問題、同一種修法，不是新的成因
