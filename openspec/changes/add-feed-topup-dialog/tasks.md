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
