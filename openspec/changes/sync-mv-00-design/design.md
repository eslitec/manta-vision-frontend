## Context

`HomeView.vue` 和 `DefaultLayout.vue` 已經實作了工作台外殼的大部分內容；這次 change 只是把文案和幾個視覺處理，對齊到目前的 Figma 設計稿（node `19:39`）。所有文字都透過 `vue-i18n` 放在 `src/lang/zh-Hant.ts` 裡（見 `home.*`、`nav.*`、`topbar.*` 這些 key），所以文案異動完全不會碰到樣板檔案。動機詳見 `proposal.md` 的 Why。

設計比對出來的兩個待確認項目，現在都有答案了，不再延後：

- 卡片右上角的小型「AI」徽章：確認代表「使用這個工具會消耗飼料」。設計稿只畫了圖生圖、AI 產生行銷 PO 文兩張卡片，經確認是設計稿遺漏，4 張生成工具卡片行為一致，都會消耗飼料，因此都要顯示這個徽章——不需要照卡片個別設定「要不要顯示」的旗標，樣板直接固定顯示即可。
- 語言切換器：確認直接移除（設計稿上沒有，且這個 App 的語言切換功能整個要拿掉）。

## Goals / Non-Goals

**Goals:**
- 完成 proposal.md「What Changes」裡列出的、屬於 MV-00 的文案與視覺調整。
- 每一項異動都只動畫面呈現層：不動 store、API 或路由。

**Non-Goals:**
- MV-01~05——各自開獨立的 change 處理。

## Decisions

- **文案異動只改 `src/lang/zh-Hant.ts`。** 專案已經用 `vue-i18n` 統一管理所有畫面文字；如果直接改樣板裡的字串，會繞過這個慣例，等之後補齊 `en.ts` 時就會產生中英文不同步的問題。考慮過的替代方案：直接改樣板文字——已否決，會破壞既有的 i18n 慣例。
- **使用中狀態的強調色條，用 CSS 偽元素（`::before`）實作在 `.sidebar__item.is-active` 上**，不新增 DOM 節點。這樣可以維持既有 `router-link` 的標籤結構不變，不影響現有的鍵盤操作／點擊事件處理。
- **品牌完成圖示改成行內 SVG 打勾圖示，放在 `.stats__item` 裡，由既有的 `brandReady` computed 驅動**，取代目前寫死在 i18n 字串 `home.brandDone` 前面的 `✓` 字元；這個 i18n 字串本身要把開頭的 `✓` 拿掉。
- **側邊欄底部連結（「教學文件」「登出」）先做成沒有實際功能的預留項目**：用 `<span>` 或未啟用樣式呈現，不用 `router-link`，因為目前還沒有對應的路由或登出流程。這樣可以避免上線一個看起來能點、實際上會 404 的死連結。
- **頂部「任務」按鈕這次只做畫面呈現，不加點擊事件／目標頁面**——理由跟側邊欄底部連結一樣：設計稿上有畫出來，但目前沒有對應的任務功能可以連過去。
- **卡片與側邊欄圖示改用 `@tabler/icons-webfont`**（`圖生圖`→`ti-sparkles`、`AI 產生行銷 PO 文`→`ti-file-text-ai`、`圖生影片`→`ti-player-play`、`AI 試穿衣服`→`ti-user`；側邊欄 `AI 生成工作台`→`ti-sparkles`、`圖庫管理中心`→`ti-library-photo`、`飼料用量`→`ti-chart-bar`、`設定`→`ti-settings`），取代原本的 emoji。這個套件專案裡已經是既有依賴，`GenerateImageView.vue`、`TryOnView.vue` 等 8 個檔案都用同一套 `i.ti.ti-*` 寫法——原本以為要另外找圖示素材才能對齊設計稿，實際盤點後發現不用，直接跟進既有慣例即可，不算新增流程。卡片底色統一用 `$blue-light`。
- **消耗飼料徽章換成設計稿提供的實際 SVG 圖檔**（一個帶「AI」字樣的瓶子插圖，內嵌在 `HomeView.vue` 樣板裡，不走圖示字型），取代原本用純文字「AI」湊出來的簡化版。這個圖示的造型跟色彩（`#A5C8E6`、`#606692`、`#F2BB00` 等）是設計稿專屬的插圖資產，不在 `@tabler/icons-webfont` 的圖示集合裡，所以用行內 SVG 而不是圖示字型 class。
- **側邊欄品牌區塊（「日安選物／Manta Vision」）套用跟使用中導覽項目相同的反白＋左側強調色條樣式**，因為目前只有一個品牌、且設計稿裡這個區塊本來就是常駐的「反白」狀態，不是靠某個互動事件觸發，所以直接套用靜態樣式，不需要額外的狀態或點擊邏輯。
- **語言切換器直接移除**（`DefaultLayout.vue` 的 `.topbar__right` 裡的 `<select>`，以及該元件 `<script setup>` 裡現在用不到的 `locale`／`SUPPORTED_LOCALES` 相關程式碼）。`en.ts`／`zh-Hant.ts` 語言檔和底層的 `vue-i18n` 設定都不受影響，只移除讓使用者切換語言的畫面控制項。考慮過的替代方案：用 CSS 隱藏——已否決，這樣會留下死程式碼和用不到的 import。
- **消耗飼料徽章固定顯示在全部 4 張卡片**，不加 per-card 的旗標／設定欄位。因為 4 張卡片行為一致（都會消耗飼料），如果只挑卡片加欄位控制顯示與否，反而是為了不存在的差異多寫一層不必要的資料結構。考慮過的替代方案：在 `genTools` 資料裡加 `consumesFeed: boolean` 欄位——已否決，YAGNI，等真的出現「有些工具不消耗飼料」的情境再加。
- **狀態列分隔線改用 `::before` 偽元素**，實作在 `.stats__item:not(:first-child)` 上，移除原本 2 個獨立的 `.stats__divider` DOM 節點；間距改用 `&:not(:first-child) { margin-left: 48px }`，不再靠 divider 元素的 `margin` 撐開。跟側邊欄強調色條同一個原則：純視覺裝飾、不帶語意，用 CSS 生成即可，不需要對應的 HTML 元素。**注意：不能直接在 `.stats` 上用 `gap: 48px`**——`.stats` 這個 flex 容器裡除了 3 個 `.stats__item` 還有 `button.stats__topup` 也是同層的 flex 子元素，`gap` 會對所有子元素間距生效，等於誤把第 3 個項目跟按鈕之間也塞進一份 48px，擠壓了 3 個項目原本能分到的寬度。改用 `margin-left` 只加在項目自己身上，才不會波及按鈕。
- **這個畫面的版面假設桌機寬螢幕（≥ 1440px 視窗寬度）**，比對發現 `.stats__item` 在窄於此寬度時，「品牌設定已完成」與其提示文字會被迫換行成 2 行——這不是排版寫錯，是設計稿本身（`main` frame 寬度 1166px）就是針對寬螢幕做的，且全專案的 CSS 目前沒有任何 media query，其他畫面同樣沒有針對窄視窗優化過。已跟使用者確認：這個 App 只需要支援桌機寬螢幕，不用因為這一點另外做響應式，因此**不修改**任何字級或間距來遷就窄視窗。
- **修正 `$blue-dark-300` 的色碼定義**（`_variables.scss`：`#171E52` → `#2E3567`），不是逐一改用到它的 14 個檔案。這個變數透過 `main.scss` 的 `body { color: $blue-dark-300 }` 是全站基礎文字色，其他檔案幾乎都只是重新宣告同一個顏色，改源頭定義即可全站生效，符合變數存在的目的。考慮過的替代方案：把 14 個檔案裡的 `$blue-dark-300` 都換成 `$blue-dark-500`（正確的色碼原本就定義在這個變數裡）——已否決，會讓 `$blue-dark-300` 變成沒人使用的孤兒變數，且要多改 14 個檔案。已知的連帶影響：`$blueGradient`（用 `$blue-dark-300` 起始色）跟著變亮，但這個漸層目前沒有任何地方引用，不影響畫面。
- **`.sidebar` 寬度修正為 200px**（原本 240px）。Figma MCP 額度持續受限，這個數值是使用者自己用 Figma 的 Inspect 面板量到的精確值，之後同類的尺寸／間距／字級比對，都會由使用者用 Inspect 逐一提供數值，取代肉眼比對截圖（後者這幾輪下來反覆出現誤判：BEM 命名、色碼、間距都抓錯過）。
- **`.sidebar__item` 的使用中反白背景改成貼齊側邊欄左右邊緣**，作法是 `margin` 抵銷 `.sidebar` 自身的水平 `padding`，再把等量的值加回 `padding-left`／`padding-right`，讓圖示與文字的實際位置不變、只是背景可以畫到側邊欄的真正邊緣。強調色條 `::before` 的 `left` 因此簡化成 `0`（不再需要抵銷 margin，因為現在就是元素自己的左邊界）。**後續確認：`.sidebar__brand`（品牌區塊）也套用同一招**——一開始不確定品牌區塊要不要跟導覽項目一樣全寬，比對新截圖後確認也要，做法完全一致。
- **字級／行高改動一律用「使用者從 Figma Inspect 量到的精確值」，不再靠肉眼比對截圖猜**（Figma MCP 額度持續受限）。**`line-height` 統一換算成無單位比例**（例如「日安選物」設計稿標註 `22px`，字級 `16px`，換算成 `22 ÷ 16 = 1.375` 寫進 CSS），不直接寫死 px 值——比例值會隨 `font-size` 等比縮放，字級以後調整時行高自動跟上，不用兩個數字分別維護、容易兩邊脫勾。同一原則套用在「Manta Vision」小字（`20 ÷ 14 = 1.4286`）。
- **側邊欄 4 個導覽圖示改成使用者提供的精確 SVG 素材，用 `<component :is>` 動態渲染，不再套用圖示字型 class。** 這些圖示是多色、多路徑的插畫（例如「AI 生成工作台」是方形底色＋雙色「AI」字樣＋金色星芒），`@tabler/icons-webfont` 這種單色圖示字型表達不出來，只能用行內 SVG。為了保留 `navItems` 的 `v-for` 資料驅動寫法（不想拆成 4 段重複的樣板），把每個圖示拆成 `src/components/icons/` 底下的小型元件（`IconAiSparkle`、`IconLibraryPhoto`、`IconFeedBottleSmall`、`IconSettings`），`navItems` 的 `icon` 欄位直接放元件本身（不是字串），樣板用 `component(:is="item.icon")` 渲染——這是 Vue 處理「資料驅動、但每一項對應到不同元件」情境的標準寫法。這幾個圖示元件目前是一次性、無 props 的靜態元件，沒有跟 `HomeView.vue` 卡片右上角既有的瓶子圖示（`card__feed-badge`）共用，雖然視覺概念相同，但兩者是 Figma 針對不同顯示尺寸（28 vs 20 viewBox）分別匯出的素材，路徑座標不是單純縮放關係，勉強合併反而可能跑掉，先各自獨立。
- **側邊欄強調色條改成跟文字／圖示等高、垂直居中**（`top:0;bottom:0` 改成 `top:50%; transform: translateY(-50%); height:20px`），不再貼滿整個項目的 padding 範圍。20px 對應圖示本身的高度，是目前最自然的高度基準。
- **首頁 5 個卡片圖示（4 張生成工具卡＋圖庫橫幅）同樣改用使用者提供的精確 SVG 素材**，新增 `IconGenImage`／`IconMarketingPost`／`IconGenVideo`／`IconTryOn`／`IconLibraryPhotoLarge` 5 個元件，做法跟側邊欄圖示一致（`<component :is>` + `genTools` 的 `icon` 欄位放元件本身）。這批 SVG 每個都自帶 `rect rx="8" fill="#EFF2FA"` 當背景（色碼剛好等於 `$blue-light`），所以把 `.card__icon` 原本額外補上的 `background`／`border-radius`／`color`／`font-size`（原本是為了幫圖示字型 class 上色、畫底）整段移除，避免背景畫兩層。跟側邊欄圖示同理，這批 40×40 的素材跟卡片右上角瓶子圖示（22px）、側邊欄圖示（20px）都是不同顯示尺寸各自匯出的版本，不強行合併共用。

## Risks / Trade-offs

- [兩個看起來能互動、但目前沒有實際功能的元素上線（任務按鈕、側邊欄底部連結）] → 用弱化／未啟用樣式呈現（依照設計稿是灰階、非全對比），讓使用者一看就知道「還沒開放」，而不是誤以為壞掉了。

## Open Questions

（無）
