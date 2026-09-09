## Context

`src/components/FeedBadge.vue`（頂部工具列，`src/layouts/DefaultLayout.vue:41` 引用）目前顯示 `IconFeedBottleSmall` 圖示、飼料餘額數字，以及一個「儲值」`AppButton`；`src/views/HomeView.vue` 的 `.stats` 區塊也有一組類似的圖示＋餘額數字＋「＋ 儲值飼料」`AppButton`。追查後確認這兩處的「儲值」按鈕都只是 `AppButton` 加上文字，沒有 `@click`、沒有 `to`，點擊完全沒有反應；飼料圖示本身也只是純展示用的行內 SVG 元件（`src/components/icons/IconFeedBottleSmall.vue`），沒有任何互動邏輯。全站沒有任何路由、彈窗、或頁面是為「儲值」設計的。使用者確認：這兩處的圖示與按鈕都應該導向既有的「飼料用量」頁面（`/usage`，`src/views/UsageView.vue`）。

## Goals / Non-Goals

**Goals:**

- `FeedBadge.vue` 與 `HomeView.vue` 裡「代表使用者目前飼料餘額」的圖示與儲值按鈕，點擊後導向 `/usage`
- 圖示補上 `aria-label`，讓螢幕報讀器使用者也知道點下去會做什麼（目前是純裝飾圖示，沒有任何無障礙標示）

**Non-Goals:**

- 不新增儲值頁面、付費流程、或彈窗；`/usage` 是既有頁面，這次只是把導覽指過去，不改動 `/usage` 本身
- 不處理成本估算情境的飼料圖示（`GenerateImageView.vue`、`GenerateVideoView.vue`、`ImageEditorWorkspace.vue`、`ConfirmGenerateDialog.vue`、`UsageView.vue` 自己列出的用量明細）——這些代表「這個操作要花多少飼料」，跟「使用者目前的餘額」是不同語意，不應該變成導覽按鈕

## Decisions

### 決策 1：飼料圖示與儲值按鈕都做成可點擊、導向同一個目的地，不是只修其中一個

使用者原始問題只問到飼料圖示，但追查後發現「儲值」按鈕本身也是死的——如果只讓圖示可以點、儲值按鈕維持沒反應，會產生「同一組 UI 裡一半能點、一半不能點」的更奇怪的不一致狀態。兩者都做成導向 `/usage`，让使用者不論點圖示還是點文字按鈕，行為都一致。

### 決策 2：用 `vue-router` 的 `useRouter().push('/usage')`，不用 `<router-link>` 包裹圖示

`FeedBadge.vue`／`HomeView.vue` 裡飼料圖示目前是行內 SVG 元件（`IconFeedBottleSmall`），外層没有現成的可點擊容器。與其把 `<router-link>` 包在圖示外面（多一層 DOM、還要處理圖示原本的行內排版），改成幫圖示外面包一個語意清楚的 `button`（`type="button"`，`@click="goToUsage"`），內部呼叫 `router.push('/usage')`——這跟專案既有的按鈕慣例一致（`AppButton` 底層預設 `tag="button"`），「儲值」的 `AppButton` 直接加 `@click="goToUsage"` 即可，不需要改成 `router-link`。

### 決策 3：飼料圖示與儲值按鈕各自獨立可點擊，不合併成單一大按鈕

雖然兩者導向同一個地方，但視覺上維持圖示、文字各自獨立，不強制把整組（圖示＋數字＋按鈕）包成一個大按鈕——那樣會讓「飼料餘額數字」本身也變得可點擊，语意上數字是純展示資訊，不是操作入口，維持現有版面結構，只讓圖示與「儲值」按鈕分別可點。

## Implementation Contract

**行為**：使用者在任何已登入頁面看到頂部工具列的飼料圖示或「儲值」按鈕，點擊後 SHALL 導航到 `/usage`；首頁飼料餘額旁的圖示與「＋ 儲值飼料」按鈕，點擊後同樣 SHALL 導航到 `/usage`。飼料圖示 SHALL 有清楚的滑鼠游標樣式（`cursor: pointer`）與 `aria-label`（文案沿用「儲值」，跟旁邊按鈕一致，因為兩者導向同一個目的地）。

**資料形狀**：純前端路由導航，不呼叫任何 API、不讀寫任何 store 狀態。

**失敗模式**：無新增失敗模式；`/usage` 頁面本身既有的載入行為（若有）不受影響。

**驗收標準**：
- `src/components/FeedBadge.vue` 的飼料圖示與「儲值」按鈕點擊後，瀏覽器網址列變成 `/usage`
- `src/views/HomeView.vue` 的飼料圖示與「＋ 儲值飼料」按鈕點擊後，瀏覽器網址列變成 `/usage`
- 兩處圖示都補上 `aria-label`，`npx vue-tsc --noEmit` 與 `npm run lint` 通過
- 其餘顯示「預估花費 N 顆飼料」的位置（見 Non-Goals 列出的五個檔案）維持原樣不可點擊，確認沒有被連帶修改

**範圍邊界**：僅限 `src/components/FeedBadge.vue` 與 `src/views/HomeView.vue` 這兩個檔案。不修改 `src/components/icons/IconFeedBottleSmall.vue`（圖示本身的 SVG 內容不變，只是外面加了可點擊的容器與事件）、不修改 `src/views/UsageView.vue`、不修改 `src/router/`（`/usage` 路由已存在，不需要新增）。

## Risks / Trade-offs

- [風險] 使用者可能誤以為「飼料用量」頁面就是可以儲值的地方，點進去卻只看到用量統計、找不到實際付費儲值的功能，可能造成困惑 → [緩解] 這是 proposal.md Non-Goals 已經記錄的已知限制——目前沒有真正的儲值頁面，`/usage` 是暫時最合理的既有目的地；等之後真的有付費儲值功能時，只需要把這裡的導航目的地換掉，不影響這次改動的其他部分
