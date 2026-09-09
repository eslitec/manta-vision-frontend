## Context

`src/components/FeedBadge.vue`（頂部工具列，`DefaultLayout.vue` 引用）與 `src/views/HomeView.vue` 的飼料圖示、「儲值」／「＋ 儲值飼料」按鈕，目前呼叫 `goToUsage()` 導向 `/usage`（`link-feed-balance-to-usage` 這個已完成的 change 做的，commit `8b3fdb3`）——那次改動的 Non-Goals 就明講「不新增獨立的儲值頁面或儲值彈窗；不是打造完整的付費儲值流程」，`/usage` 只是暫時最合理的既有目的地。使用者現在明確要求做出真正的儲值畫面。

全專案目前沒有任何付款方式、套餐、價格的既有機制（mock 與 real API、openspec 規格皆無）；`src/stores/feed.ts` 只有 `balance`／`loaded`／`refresh()`，沒有異動餘額的方法。專案沒有共用的 `AppModal.vue` 外殼元件，既有彈窗都是各自 hand-roll 一份 `.modal`／`.confirm` 結構，共用 `src/composables/useAccessibleDialog.ts` 處理焦點鎖定／Escape／`inert` 背景；`src/components/ConfirmGenerateDialog.vue`（167 行）是複雜度最接近的參考：標題、幾行選項/成本資訊、取消／確認按鈕，使用 `defineModel` 搭配 `v-model:open`。

## Goals / Non-Goals

**Goals:**

- 使用者點擊飼料圖示或「儲值」按鈕，看到一個可以選套餐、確認、立即看到餘額增加的彈出式視窗
- 沿用專案既有的無障礙彈窗慣例與按鈕元件，不新增共用的通用 Modal 外殼元件（這次只有一個使用場景）

**Non-Goals:**

- 不串接真實金流（詳見 proposal.md Non-Goals）
- 不改變 `/usage` 頁面內容
- 不做套餐管理後台

## Decisions

### 決策 1：彈出式視窗，不做獨立頁面

跟現有「選一個東西→確認→送出」的彈窗（`ConfirmGenerateDialog.vue`、`LibraryView.vue` 的刪除確認彈窗）複雜度相當——3 個套餐選項＋一個確認按鈕，不需要多步驟表單或頁面級的版面。`src/router/routes.ts` 目前也沒有任何「結帳流程」式的頁面前例（所有既有路由都是完整頁面，既有的「選一個東西再確認」流程如刪除素材、另存新素材，都是用彈窗蓋在既有頁面上，不是切換路由）。新增路由對這個複雜度的功能是不必要的間接層。

### 決策 2：`TopUpDialog.vue` 做成共用元件，不是各自寫在 `FeedBadge.vue`／`HomeView.vue` 裡

跟 `LibraryView.vue` 的刪除確認彈窗（只有圖庫頁一個使用場景、直接寫在該檔案裡）不同，這個彈窗有兩個進入點（頂部工具列、首頁），且行為完全一致（同一組套餐、同一支 API），沒有理由複製兩份幾乎相同的彈窗標記與邏輯——抽成 `src/components/TopUpDialog.vue`，用 `defineModel` 的 `v-model:open` 模式（比照 `ConfirmGenerateDialog.vue`），兩個進入點各自 import、各自維護自己的 `topUpOpen` 狀態 ref。

### 決策 3：選套餐 → 按「確認儲值」才送出，不是點卡片就立刻觸發

沿用 `ConfirmGenerateDialog.vue` 的兩段式互動慣例（先標記選取狀態、再由使用者主動按下主要動作按鈕才真正送出），避免使用者不小心點到套餐卡片就直接被扣款／加值。未選取任何套餐時，「確認儲值」按鈕 SHALL disable。

### 決策 4：固定 3 個套餐（500／1500／3000 顆），寫死在前端

目前沒有任何後端套餐資料可以查詢（proposal.md Non-Goals 已說明），這次先用 3 個固定數字讓功能可以動起來；套餐的實際數字與名稱之後如果要改，直接改程式碼裡的常數即可，不建立套餐管理機制（那是後台功能，超出這次範圍）。

### 決策 5：新增 `topUpFeed` 只在 `src/api/mock.ts` 實作，`src/api/real.ts` 不動

真後端目前沒有任何付款/儲值端點。如果在 `real.ts` 也加一個呼叫真實路由的實作，會打到一個不存在的 API、在串接真後端時直接失敗。這個功能因此明確只在 `VITE_USE_MOCK=true` 時可用——`src/types/api.ts` 定義 `Api` 介面時，把 `topUpFeed` 標成可選方法（`topUpFeed?(packageId: string): Promise<{ balance: number }>`），`real.ts` 不需要實作這個可選方法，TypeScript 型別檢查不會因此報錯；呼叫端（`TopUpDialog.vue`）用 `api.topUpFeed?.(...)` 呼叫，若方法不存在（真後端模式）則顯示「這個環境尚未支援模擬儲值」之類的錯誤訊息而不是讓畫面壞掉——不過目前唯一會使用這個彈窗的環境就是本機開發（mock 模式），這只是防禦性處理，不是這次的主要使用情境。

### 決策 6：送出成功後用「完成」按鈕手動關閉，不做自動關閉計時器

自動關閉（例如 3 秒後自動 close）在 Playwright 測試裡容易因為時序不穩定造成 flaky test，而且使用者可能還想再看一下新餘額或再儲值一次。改成顯示成功狀態＋一個「完成」按鈕，使用者確認後才關閉彈窗，跟專案裡其他彈窗（例如刪除確認）都需要使用者主動操作才關閉的體驗一致。

## Implementation Contract

**行為**：使用者在任何已登入頁面點擊飼料圖示或「儲值」／「＋ 儲值飼料」按鈕，SHALL 開啟 `TopUpDialog`彈窗（不再導航到 `/usage`）。彈窗顯示 3 個套餐卡片（500／1500／3000 顆），使用者點選一個卡片標記為選取狀態（同時間只能選一個）；「確認儲值」按鈕在未選取任何套餐時 SHALL disable，選取後 SHALL 變成可點擊。使用者點擊「確認儲值」後，SHALL 呼叫 `topUpFeed(packageId)`，成功後彈窗 SHALL 切換成顯示成功訊息（含儲值的顆數），並且畫面上（頂部工具列與首頁）顯示的飼料餘額 SHALL 同步更新成新數字。使用者點擊「完成」按鈕後彈窗 SHALL 關閉，並重置回未選取任何套餐的初始狀態（下次開啟不會殘留上次的選取狀態）。

**資料形狀**：`topUpFeed(packageId: string): Promise<{ balance: number }>`——輸入套餐識別碼（例如 `'pkg-500'`／`'pkg-1500'`／`'pkg-3000'`），回傳更新後的飼料餘額。套餐清單本身（id、顆數、顯示文字）定義成前端常數陣列，不透過 API 查詢。

**失敗模式**：`topUpFeed` 呼叫失敗時（mock 環境理論上不會失敗，但仍要處理網路層級的例外），彈窗 SHALL 顯示錯誤訊息並保持在選取狀態（不切到成功畫面），讓使用者可以重試；不 SHALL 讓錯誤直接拋出到畫面外造成白屏。真後端模式（`api.topUpFeed` 不存在）時，點擊「確認儲值」SHALL 顯示明確的不支援訊息，SHALL NOT 呼叫不存在的方法造成執行期錯誤。

**驗收標準**：
- 瀏覽器手動驗證：點擊頂部工具列飼料圖示／「儲值」按鈕、首頁飼料圖示／「＋ 儲值飼料」按鈕，四個進入點都能開啟 `TopUpDialog`
- 未選取套餐時「確認儲值」按鈕為 disable；選取後變成可點擊
- 點擊「確認儲值」後，畫面上的飼料餘額數字正確增加對應套餐的顆數，彈窗顯示成功訊息
- 點擊「完成」關閉彈窗；重新開啟彈窗時套餐選取狀態已重置
- `npm run lint` 與 `npx vue-tsc --noEmit` 通過

**範圍邊界**：僅限 proposal.md Impact 列出的檔案。不修改 `src/api/real.ts`、`src/views/UsageView.vue`、`src/router/`、其餘顯示「預估花費」的成本提示元件。

## Risks / Trade-offs

- [風險] `topUpFeed` 標成可選方法、只在 mock 實作，如果之後有人忘記這個限制、直接在真後端模式下呼叫，使用者會看到「尚未支援」的訊息而不是真的完成儲值 → [緩解] 這是刻意的、有記錄的限制（決策 5），等真後端有付款端點時再補上 `real.ts` 的實作；已在 Non-Goals 與 Implementation Contract 的失敗模式明確記錄，不是遺漏
- [風險] 套餐數字（500／1500／3000）目前沒有業務單位確認過，可能跟實際定價策略不符 → [緩解] 這只是讓功能可以先動起來的預設值，之後有明確定價時直接改常數即可，不影響其他程式邏輯
