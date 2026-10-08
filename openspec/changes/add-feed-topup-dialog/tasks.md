## 1. 資料層與型別

- [x] 1.1 `src/types/api.ts`（或既有定義 `Api` 介面之處）新增可選方法 `topUpFeed?(packageId: string): Promise<{ balance: number }>`，落地設計決策「決策 5：新增 `topUpFeed` 只在 `src/api/mock.ts` 實作，`src/api/real.ts` 不動」
- [x] 1.2 `src/api/mock.ts` 實作 `topUpFeed`：依 `packageId` 對照套餐顆數（500／1500／3000），加進 `db.feedBalance`，比照 `getFeed()` 的 `delay()` 慣例後回傳 `{ balance }`
- [x] 1.3 確認 `src/api/real.ts` 不新增對應實作，`npx vue-tsc --noEmit` 確認可選方法不會造成型別錯誤

## 2. TopUpDialog 元件

- [x] 2.1 新增 `src/components/TopUpDialog.vue`，落地設計決策「決策 2：`TopUpDialog.vue` 做成共用元件，不是各自寫在 `FeedBadge.vue`／`HomeView.vue` 裡」：用 `defineModel` 的 `v-model:open` 模式，`Teleport(to="body")` ＋ `useAccessibleDialog`
- [x] 2.2 落地設計決策「決策 4：固定 3 個套餐（500／1500／3000 顆），寫死在前端」：套餐常數陣列（id、顆數、顯示文字），render 成可點選的卡片列表
- [x] 2.3 落地設計決策「決策 3：選套餐 → 按「確認儲值」才送出，不是點卡片就立刻觸發」：套餐卡片點擊只標記選取狀態（`selectedPackageId` ref），「確認儲值」按鈕在 `selectedPackageId` 為空時 disable
- [x] 2.4 對齊 Requirement「確認儲值後立即模擬交易並更新餘額顯示」新增內容：點擊「確認儲值」呼叫 `api.topUpFeed?.(selectedPackageId)`；若方法不存在（真後端模式），顯示不支援訊息，不呼叫、不拋出執行期錯誤；成功後切換到成功畫面（顯示儲值顆數），並呼叫 `useFeedStore().refresh()`（或直接寫入回傳的新餘額）讓畫面上的餘額同步更新
- [x] 2.5 落地設計決策「決策 6：送出成功後用「完成」按鈕手動關閉，不做自動關閉計時器」：成功畫面顯示「完成」按鈕，點擊後 `open` 設為 `false` 並重置 `selectedPackageId`、成功狀態，確保下次開啟是乾淨的初始狀態

## 3. 串接進入點

- [x] 3.1 落地設計決策「決策 1：彈出式視窗，不做獨立頁面」：`src/components/FeedBadge.vue` 把飼料圖示與「儲值」按鈕的 `@click="goToUsage"` 改成開啟 `TopUpDialog`（新增 `topUpOpen` ref，import 並掛載 `TopUpDialog(v-model:open="topUpOpen")`），不新增路由，移除不再需要的 `goToUsage`／`useRouter` 呼叫（若這個元件沒有其他地方用到路由跳轉）
- [x] 3.2 `src/views/HomeView.vue`：同樣把飼料圖示與「＋ 儲值飼料」按鈕改成開啟 `TopUpDialog`
- [x] 3.3 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts` 新增彈窗標題、套餐顯示文字、成功訊息、「確認儲值」「完成」等按鈕文案的 i18n key，兩邊 key 結構一致

## 4. 驗證

- [x] 4.1 對齊 Requirement「使用者可透過彈出式視窗選擇飼料套餐並模擬儲值」——瀏覽器手動驗證（Playwright，真後端帳號 qa_brand_test，本機 mock 模式）：分別點擊頂部工具列飼料圖示、頂部「儲值」按鈕、首頁飼料圖示、首頁「＋ 儲值飼料」按鈕，確認四者都能開啟 `TopUpDialog` 且不導航離開目前頁面
- [x] 4.2 瀏覽器手動驗證：未選取套餐時「確認儲值」按鈕為 disable；點選套餐後變成可點擊；改點另一個套餐時只有新選的套餐維持選取狀態
- [x] 4.3 對齊 Requirement「確認儲值後立即模擬交易並更新餘額顯示」——瀏覽器手動驗證：選取「1500 顆」套餐並確認，確認頂部工具列與首頁的飼料餘額都正確增加 1500，彈窗顯示成功訊息；點擊「完成」關閉後重新開啟，確認彈窗回到未選取的初始狀態
- [x] 4.4 `npm run lint` 與 `npx vue-tsc --noEmit` 通過
- [x] 4.5 執行 `spectra validate add-feed-topup-dialog --strict` 與 `spectra analyze add-feed-topup-dialog`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 4.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive add-feed-topup-dialog`

## 5. 全站飼料圖示皆可點擊（ingest，2026-09-09）

- [x] 5.1 落地設計決策「決策 7（2026-09-09 ingest）：所有非巢狀的成本／餘額提示圖示，包一層按鈕開啟 `TopUpDialog`」：`src/components/ConfirmGenerateDialog.vue` 的 `confirm__cost`／`confirm__balance` 兩處 `IconFeedBottleSmall` 包一層 `button(type="button")`，點擊時先呼叫既有的 `cancel()` 關閉本身，再把新增的 `topUpOpen` ref 設成 `true` 並掛載 `TopUpDialog(v-model:open="topUpOpen")`，按鈕加上 `aria-label="t('feedBadge.topup')"`（沿用既有「儲值」語意的 key，比原本任務描述的 `home.topup` 更通用簡潔）
- [x] 5.2 落地設計決策「決策 7（2026-09-09 ingest）：所有非巢狀的成本／餘額提示圖示，包一層按鈕開啟 `TopUpDialog`」：`src/components/ImageEditorWorkspace.vue` 的 `aiCost__amount--item`（第 315 行附近）與 `aiCost__amount--total`（第 320 行附近）兩處 `IconFeedBottleSmall` 包一層按鈕，開啟新增的 `topUpOpen`／`TopUpDialog`；第 32 行（`label.option` 內的選項成本標籤）與第 96 行（`button.tool` 內的工具成本標籤）維持不動
- [x] 5.3 落地設計決策「決策 7（2026-09-09 ingest）：所有非巢狀的成本／餘額提示圖示，包一層按鈕開啟 `TopUpDialog`」：`src/views/GenerateImageView.vue` 的 `cost__icon` 包一層按鈕，開啟新增的 `topUpOpen`／`TopUpDialog`
- [x] 5.4 落地設計決策「決策 7（2026-09-09 ingest）：所有非巢狀的成本／餘額提示圖示，包一層按鈕開啟 `TopUpDialog`」：`src/views/GenerateVideoView.vue` 的 `cost__icon` 包一層按鈕，開啟新增的 `topUpOpen`／`TopUpDialog`
- [x] 5.5 落地設計決策「決策 7（2026-09-09 ingest）：所有非巢狀的成本／餘額提示圖示，包一層按鈕開啟 `TopUpDialog`」：`src/views/MarketingPostView.vue` 的 `cost__icon`（第 46 行附近的 `.cost__value`）包一層按鈕，開啟新增的 `topUpOpen`／`TopUpDialog`；第 11 行的 `outputTypeCard__icon`（巢狀在 `button.outputTypeCard` 內）維持不動
- [x] 5.6 落地設計決策「決策 7（2026-09-09 ingest）：所有非巢狀的成本／餘額提示圖示，包一層按鈕開啟 `TopUpDialog`」：`src/views/TryOnView.vue` 的 `cost__icon` 包一層按鈕，開啟新增的 `topUpOpen`／`TopUpDialog`
- [x] 5.7 落地設計決策「決策 7（2026-09-09 ingest）：所有非巢狀的成本／餘額提示圖示，包一層按鈕開啟 `TopUpDialog`」：`src/views/UsageView.vue` 四處圖示（`quota__value`、`gaugeLabels__remaining`、`module__feedIcon`、`metric__feedIcon`）都包一層按鈕，開啟新增的 `topUpOpen`／`TopUpDialog`
- [x] 5.8 落地設計決策「決策 8（2026-09-09 ingest）：例外清單裡的圖示維持不可點擊，不做替代方案」，對齊 Requirement「全站飼料圖示只要不巢狀在既有互動元素內，皆可點擊開啟儲值彈窗」：`agent-browser` 確認 `src/layouts/DefaultLayout.vue` 的側邊導覽連結、`src/views/HomeView.vue` 第 34 行的 `IconFeedBottleBadge.card__feedBadge`（`.card__feedBadge button` 數量為 0）、`src/components/TopUpDialog.vue` 自己內部兩處套餐圖示皆維持不動，沒有被誤改
- [x] 5.9 `npx vue-tsc --noEmit` 與 `npm run lint` 通過（皆無輸出，代表無錯誤）
- [x] 5.10 對齊 Requirement「生成前確認彈窗的飼料圖示可以點擊儲值」——瀏覽器手動驗證（`agent-browser`，真後端帳號 `qa_brand_test`）：在圖生影流程點擊「生成影片」觸發 `ConfirmGenerateDialog`，點擊「預估花費」旁的飼料圖示，確認 `ConfirmGenerateDialog` 消失、`TopUpDialog`（標題「儲值飼料」）接著開啟，畫面上同時只有一個對話框
- [x] 5.11 對齊 Requirement「AI 生成工作台各頁面的成本提示圖示可以點擊儲值」——瀏覽器手動驗證：分別在 `GenerateImageView`（圖生圖）、`MarketingPostView`（貼文生成）點擊「預估花費」旁的飼料圖示確認開啟 `TopUpDialog`；`ImageEditorWorkspace` 選定素材並套用「背景移除」工具後，「AI 已使用工具」清單的飼料圖示（`.aiCost__feedBtn`，共 2 個）點擊後也正確開啟 `TopUpDialog`；`GenerateVideoView`／`TryOnView` 的 `cost__icon` 與 `GenerateImageView`／`MarketingPostView` 共用同一份 pug／CSS 樣式片段，程式碼審閱確認寫法一致
- [x] 5.12 對齊 Requirement「飼料用量頁面的圖示可以點擊儲值」——瀏覽器手動驗證：在 `UsageView`「用量統計」分頁點擊配額（`quota__value`）旁的飼料圖示確認開啟 `TopUpDialog`；切到「AI 表現指標」分頁，「每採用素材成本」卡片的 `.usageFeedBtn` 點擊後同樣開啟 `TopUpDialog`；`gaugeLabels__remaining`／`module__feedIcon` 兩處共用同一個 `usageFeedBtn` class 與相同的 `@click="topUpOpen = true"` 寫法，程式碼審閱確認一致
- [x] 5.13 對齊 Requirement「巢狀在既有互動元素內的圖示維持原本行為，不變成獨立按鈕」——瀏覽器手動驗證：`document.querySelectorAll('.outputTypeCard button.usageFeedBtn, .outputTypeCard button.cost__feedBtn').length` 為 0（`MarketingPostView` 輸出類型卡片沒有巢狀按鈕）；`document.querySelectorAll('.tool--remove .tool__cost button').length` 為 0（`ImageEditorWorkspace` 背景移除工具按鈕內的成本標籤沒有巢狀按鈕）；`HomeView` 卡片徽章原本也在這條 Scenario 的驗證範圍內，2026-09-10 ingest 後改走決策 9 的伸展連結寫法變成可點擊，驗證移到第 6 節
- [x] 5.14 執行 `spectra validate add-feed-topup-dialog --strict` 與 `spectra analyze add-feed-topup-dialog`，確認沒有 CRITICAL／WARNING 級別的發現（僅剩本次 ingest 之前就存在、與這次改動無關的 4 個 SUGGEST 級別發現）

## 6. 首頁工具卡片飼料徽章可點擊（ingest，2026-09-10）

- [x] 6.1 落地設計決策「決策 9（2026-09-10 ingest）：`HomeView.vue` 卡片徽章改用「伸展連結」（stretched link）拆解巢狀按鈕問題」：`src/views/HomeView.vue` 把 `router-link.card` 拆成 `.card`（外層 div，維持背景／圓角／陰影／`position: relative`）＋內部的 `router-link.card__link`（接手原本 `.card` 的 flex 排版，包住 `.card__icon`／`.card__body`）＋同層級的 `button.card__feedBadgeBtn`（包住 `IconFeedBottleBadge.card__feedBadge`，維持原本 `top: 1.25rem; right: 1.25rem` 的絕對定位座標）；連帶修正 `.card--wide`（首頁下方「圖庫管理中心」寬版卡片，仍是單層 `router-link.card.card--wide`，未套用新的 `.card__link` 包裝）因為 `.card` 拿掉共用的 `flex` 排版而需要補回 `display: flex; gap: 0.75rem`，避免版面跑掉
- [x] 6.2 `button.card__feedBadgeBtn` 加上 `type="button"`、`@click.stop="topUpOpen = true"`（沿用既有的 `topUpOpen` ref，不新增重複的旗標）、`aria-label="t('feedBadge.topup')"`；連帶把 `v-for="t in genTools"` 的迴圈變數改名為 `tool`，避免跟 `useI18n()` 的 `t` 函式在同一個模板作用域裡撞名（`aria-label="t('feedBadge.topup')"` 原本會被迴圈變數 `t` 覆蓋掉，`vue-tsc` 抓到「This expression is not callable」型別錯誤）
- [x] 6.3 `npx vue-tsc --noEmit` 與 `npm run lint` 通過
- [x] 6.4 對齊 Requirement「首頁工具卡片的飼料徽章可以點擊儲值，不影響卡片本身的導覽」——瀏覽器手動驗證（`agent-browser`，真後端帳號 `qa_brand_test`）：對 `.card__feedBadgeBtn` 派發點擊事件，確認開啟 `TopUpDialog` 且 `location` 仍是首頁 `/`；對 `.card__link` 派發點擊事件，確認導航到 `/generate/image`；「圖庫管理中心」寬版卡片截圖確認版面（圖示／標題／說明／「前往圖庫」按鈕）沒有跑版
- [x] 6.5 執行 `spectra validate add-feed-topup-dialog --strict` 與 `spectra analyze add-feed-topup-dialog`，確認沒有 CRITICAL／WARNING 級別的發現
