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

### 決策 7（2026-09-09 ingest）：所有非巢狀的成本／餘額提示圖示，包一層按鈕開啟 `TopUpDialog`

proposal.md 的 Non-Goal 反轉後，以下每個檔案都要：(a) 在圖示外包一層 `button(type="button")`，`@click` 把該檔案自己的 `topUpOpen` ref 設成 `true`；(b) 若檔案本來沒有 `topUpOpen` 狀態，新增一個 `ref(false)` 並在樣板掛載 `TopUpDialog(v-model:open="topUpOpen")`（import 路徑 `@/components/TopUpDialog.vue`，比照 `FeedBadge.vue`／`HomeView.vue` 既有寫法）；(c) 按鈕加上 `aria-label="t('home.topup')"`（沿用既有語意一致的 i18n key，不新增重複語意的 key）；(d) 不改變圖示旁邊原本文字的排版結構，只在圖示外面多一層 `button`。

逐檔案清單：

- `src/components/ConfirmGenerateDialog.vue`：兩處圖示（`confirm__cost` 的成本圖示、`confirm__balance` 的餘額圖示）都改成按鈕，但這個元件本身是疊在其他頁面上的 `alertdialog`，`useAccessibleDialog` 用全域 `document` 監聽 Escape／Tab 做焦點鎖定——如果讓 `TopUpDialog` 疊在它上面同時開兩個對話框，兩份 `keydown` 監聽器會同時處理同一次 Escape 按鍵（因為都沒有 `stopPropagation`），導致按一次 Escape 兩個對話框一起關閉，行為不直覺。決策：點擊這兩個圖示按鈕時，SHALL 先呼叫既有的 `cancel()`（關閉 `ConfirmGenerateDialog` 本身，等同使用者放棄這次生成操作），再把（呼叫端傳入或組件內新增的）`topUpOpen` 設成 `true` 開啈 `TopUpDialog`——同一時間只會有一個對話框開著，不新增疊對話框的技術風險
- `src/components/ImageEditorWorkspace.vue`：只處理沒有巢狀在其他按鈕內的兩處——`aiCost__amount--item`（每筆已使用工具的成本，第 315 行附近）與 `aiCost__amount--total`（總計，第 320 行附近）；第 32 行（巢狀在 `label.option` 內，`AppCheckbox` 選項的每項成本標籤）維持不動——這個標籤巢狀在 checkbox 的 `label` 底下，是每個修圖選項各自的成本提示，若也包一層按鈕會在同一個清單裡疊出多個功能相同的儲值按鈕，對這種重複多筆的清單而言是不必要的視覺雜訊，跟決策 3（HomeView 卡片徽章）同樣的「巢狀在既有互動清單項目、會製造重複按鈕」考量；第 96 行已經巢狀在 `button.tool`（背景移除工具按鈕）內部，屬於 HTML 不允許的按鈕巢狀按鈕，proposal.md Non-Goals 已列為例外
- `src/views/GenerateImageView.vue`、`src/views/GenerateVideoView.vue`、`src/views/TryOnView.vue`：各自只有一處 `cost__icon`，都是獨立的 `div`/`span`，直接包一層按鈕即可，新增各自的 `topUpOpen` ref 與 `TopUpDialog` 掛載
- `src/views/MarketingPostView.vue`：只處理 `cost__icon`（第 46 行附近，獨立的 `.cost__value` 區塊）；`outputTypeCard__icon`（第 11 行）巢狀在 `button.outputTypeCard` 內部，屬於例外，proposal.md Non-Goals 已列出
- `src/views/UsageView.vue`：四處（`quota__value` 的圖示、`gaugeLabels__remaining` 的圖示、`module__feed` 的圖示、`metric__feedIcon` 的圖示）都是獨立的行內元素，全部包一層按鈕；這個頁面本身就是「飼料用量」頁，新增的按鈕讓使用者在看用量明細時能就地儲值，跟這個頁面的既有目的一致，新增 `topUpOpen` ref 與 `TopUpDialog` 掛載

### 決策 8（2026-09-09 ingest）：例外清單裡的圖示維持不可點擊，不做替代方案

proposal.md Non-Goals 列出的例外（`DefaultLayout.vue` 導覽連結、`MarketingPostView.vue` 的 `outputTypeCard__icon`、`ImageEditorWorkspace.vue` 的工具按鈕內成本標籤與 `label.option` 內的選項成本標籤）SHALL NOT 額外做「點擊卡片/按鈕本身也觸發儲值」之類的替代方案——這些既有互動元素各自已經有明確、不該被覆蓋的既有點擊行為（導覽、選取生成類型、選取工具、勾選選項），這次需求的範圍是「圖示本身可點擊」，不是「重新設計這些既有元件的互動」。

**（2026-09-10 ingest：`HomeView.vue` 卡片徽章已從這份例外清單移除，改用決策 9 的「伸展連結」寫法讓它可點擊，不再是不可解的巢狀按鈕問題。）**

### 決策 9（2026-09-10 ingest）：`HomeView.vue` 卡片徽章改用「伸展連結」（stretched link）拆解巢狀按鈕問題

使用者事後追加需求：`HomeView.vue` 工具卡片右上角的 `IconFeedBottleBadge.card__feedBadge` 徽章也要能點擊開啟 `TopUpDialog`，推翻決策 8 原本因為「巢狀在 `router-link.card` 內，HTML 不允許按鈕巢狀連結」而列入例外的判斷。

解法不是硬把 `button` 塞進 `router-link` 裡面（那仍然是無效標記），而是把原本「整張卡片都是一個 `router-link`」的結構，拆成「卡片本身是普通 `div`，內部有一個貼齊卡片內容區、負責導覽的 `router-link.card__link`，飼料徽章則獨立變成同層級的 `button.card__feedBadgeBtn`」：

```
.card
  router-link.card__link(:to="t.to")
    .card__icon
      component(:is="t.icon")
    .card__body
      .card__title {{ t.title }}
      .card__desc {{ t.desc }}
  button.card__feedBadgeBtn(type="button" @click.stop="topUpOpen = true" :aria-label="t('feedBadge.topup')")
    IconFeedBottleBadge.card__feedBadge
```

`.card` 維持原本的背景／圓角／陰影／`position: relative`；`.card__link` 接手原本 `.card` 的 `flex` 排版屬性並填滿卡片內容區，可及名稱一樣是圖示＋標題＋說明文字組成，跟改版前用同一段文字導覽的行為相同；`.card__feedBadgeBtn` 維持原本 `.card__feedBadge` 的 `position: absolute; top: 1.25rem; right: 1.25rem` 座標，因為是絕對定位元素會自然疊在同層的 `.card__link` 之上，點擊徽章只會觸發按鈕本身、不會落到底下的連結，點擊卡片其他區域則維持原本的導覽行為不變。

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

**範圍邊界**：僅限 proposal.md Impact 列出的檔案。不修改 `src/api/real.ts`、`src/router/`。

**（2026-09-09 追加）全站圖示可點擊的驗收標準**：
- `src/components/ConfirmGenerateDialog.vue`、`src/components/ImageEditorWorkspace.vue`（僅 `aiCost__amount--item`／`aiCost__amount--total` 兩處）、`src/views/GenerateImageView.vue`、`src/views/GenerateVideoView.vue`、`src/views/MarketingPostView.vue`（僅 `cost__icon`）、`src/views/TryOnView.vue`、`src/views/UsageView.vue`（四處）——圖示點擊後 SHALL 開啟 `TopUpDialog`
- `ConfirmGenerateDialog.vue` 的兩處點擊 SHALL 先關閉 `ConfirmGenerateDialog` 本身再開啟 `TopUpDialog`，不SHALL 同時有兩個對話框開著
- `src/layouts/DefaultLayout.vue` 導覽連結、`src/views/HomeView.vue` 第 34 行卡片徽章、`src/views/MarketingPostView.vue` 的 `outputTypeCard__icon`、`src/components/ImageEditorWorkspace.vue` 第 32／96 行——SHALL NOT 被改動，維持原本的既有行為（導覽／卡片連結／選取輸出類型／選取工具／勾選選項）

## Risks / Trade-offs

- [風險] `topUpFeed` 標成可選方法、只在 mock 實作，如果之後有人忘記這個限制、直接在真後端模式下呼叫，使用者會看到「尚未支援」的訊息而不是真的完成儲值 → [緩解] 這是刻意的、有記錄的限制（決策 5），等真後端有付款端點時再補上 `real.ts` 的實作；已在 Non-Goals 與 Implementation Contract 的失敗模式明確記錄，不是遺漏
- [風險] 套餐數字（500／1500／3000）目前沒有業務單位確認過，可能跟實際定價策略不符 → [緩解] 這只是讓功能可以先動起來的預設值，之後有明確定價時直接改常數即可，不影響其他程式邏輯
