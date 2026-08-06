## Context

見 `proposal.md` 的 Why。這個 change 延續 `sync-mv-00-design` 建立的做法：Figma MCP 額度持續受限（View seat 的 Professional 方案），改由使用者用 Figma Inspect 面板逐一提供精確數值（色碼、間距、字級、行高比例）與 SVG 素材，取代肉眼比對截圖。每一項修改都會先跑 `npm run build` 確認編譯通過，再啟動本機開發伺服器搭配瀏覽器實際渲染結果（DOM／CSS 斷言）驗證，而不是只看程式碼推論。

`LibraryView.vue` 目前的圖示（搜尋、從圖庫加入、上傳、素材縮圖型別）都還是用 `@tabler/icons-webfont`（`i.ti.ti-*`），是 MV-00 一開始也用過的過渡方案，之後在 MV-00 陸續被使用者提供的精確 SVG 素材取代。這裡是否需要同樣替換，要看設計稿實際樣式而定。

## Goals / Non-Goals

**Goals:**
- 讓 `LibraryView.vue` 的視覺呈現（文案、間距、字級、行高、色碼、圖示）對齊目前的 Figma 設計稿。
- 補齊設計稿上實際存在、但目前實作完全沒有的功能：資料夾／系統分類左側結構、批次選取與批次操作（移至資料夾、移出資料夾、刪除、下載）、分頁。這些不是原本規劃的純視覺校對，而是使用者提供完整畫面截圖後發現的結構性落差，範圍因此擴大到功能面（已跟使用者確認一起做）。

**Non-Goals:**
- 不處理 `DefaultLayout.vue` 共用外殼——那屬於 `home-workbench-ui`，已經在 `sync-mv-00-design` 處理過；除非這輪比對發現外殼本身也需要為這頁調整，屆時另外討論。
- 非同步生成進度卡（圖庫格線內顯示生成中的項目、頂部「任務」按鈕數字徽章）不在這個 change 處理——這組功能會跨到 `DefaultLayout.vue`（`home-workbench-ui`），需要另外討論資料來源怎麼在兩個頁面共用，見下方 Open Questions。
- 「下載」與刪除確認彈窗上的「已被生成結果引用」警示不會做出真正的功能：前者是因為 `Asset` 型別沒有真實檔案 URL，後者是因為資料模型沒有記錄素材與生成紀錄的關聯，兩者都只做畫面呈現／先省略，等真實資料到位再補。

## Decisions

- **左側資料夾清單從單一扁平清單，改成「全部素材」／「系統分類」／「我的資料夾」三段式結構，三者共用同一個互斥單選狀態 `activeView`。** 原本的 `activeFolder`（只有「全部素材」或某個資料夾兩種值）已經不夠表達「系統分類」這第三種篩選維度，改用 `{ kind: 'all' } | { kind: 'category', tag } | { kind: 'folder', name }` 的判別聯合型別（discriminated union），篩選邏輯（`filtered` computed）依 `kind` 分支處理。系統分類的數量（物件素材／AI 生成／編輯產物／影片）跟資料夾的數量，都是從目前已載入的 `assets` 陣列即時算出（`computed` + `Map`），不是後端另外提供的欄位——這樣數量永遠跟畫面上實際顯示的素材一致，不會有後端數字跟前端篩選結果不同步的問題。
- **批次選取用 `Set<string>` 儲存選取的 id，可跨頁累積，但切換篩選條件（資料夾／系統分類／來源／關鍵字）時清空。** 選取行為理論上應該跟著「目前看到的素材」變化：換了篩選條件代表使用者的注意力已經轉移到不同的一批素材，保留舊的選取容易讓人誤以為是對新篩選結果操作，所以用 `watch` 監看這三個篩選維度，一有變動就呼叫 `clearSelection()`。分頁（`page`）則不會清空選取——在同一個篩選條件下跨頁挑素材再一次性搬移／刪除，是這個功能存在的主要理由，清空反而違背需求。
- **「移至資料夾」跟「刪除」都改成獨立的彈窗（`Teleport(to="body")`），取代原本用 `confirm()`／小型下拉選單的做法。** 這兩個是有明確破壞性或批次影響的操作（刪除不可復原、移動涉及多筆素材），設計稿也明確畫出完整彈窗流程（資料夾清單＋可就地建立新資料夾；縮圖預覽＋勾選才能刪除），用瀏覽器原生 `confirm()` 沒辦法呈現這些細節，所以照設計稿做成真正的彈窗元件。兩個彈窗都直接寫在 `LibraryView.vue` 裡（不像 `ImagePickerDialog` 拆成獨立元件），因為它們緊密依賴這個頁面已有的 `selectedIds`／`folders`／`activeView` 狀態，且目前沒有其他頁面需要重用。
- **「移出資料夾」新增 `removeFromFolder`（`useAssets` composable＋`mock.ts`），跟既有的 `addToFolder` 對稱。** 之前只有「加入資料夾」的能力，這次批次操作列需要「從目前資料夾移除」，補上對應的反向操作，實作方式跟 `addToFolder` 一致（過濾陣列而不是整個刪除素材，素材本身與其他資料夾歸屬不受影響）。
- **「刪除」新增 `deleteAssets`（`useAssets` composable＋`mock.ts` 的 `deleteImages`），直接從 `db.assets` 陣列移除。** 這是這個 mock 後端第一次出現「真正拿掉一筆資料」的操作（之前都是新增／修改），所以特地在確認彈窗加上「我了解此操作無法復原」的勾選閘門，降低誤刪的風險。
- **分頁固定 8 筆一頁、純前端切頁（`Array.slice`），不是跟後端要某一頁的資料。** 因為 `useAssets` 本來就是一次把整份 `assets` 陣列載入記憶體（沒有分頁 API），在這個前提下前端分頁是最小改動；頁碼列的省略號用「保留頭 3 頁、尾 1 頁、目前頁±1」的規則算，跟設計稿範例（總頁數 16、目前第 1 頁 → `1 2 3 … 16`）對得上。

## Risks / Trade-offs

- [Figma MCP 額度持續受限，只能靠使用者手動提供數值，逐項比對速度較慢] → 沿用 MV-00 建立的流程：使用者提供 Inspect 截圖／數值 → 我對照程式碼修改 → build＋瀏覽器渲染驗證 → 記錄進 `tasks.md`／`design.md`，累積下來仍可完整覆蓋整頁。
- [批次操作、資料夾重構這些功能性改動疊加在原本只規劃做視覺校對的 change 裡，跟 proposal.md 最初的 Why／What Changes 描述有落差] → 已跟使用者確認納入同一個 change，但這份 design.md 明確記錄「範圍擴大」這件事本身，避免之後回頭看 tasks.md 時搞不清楚為什麼一個視覺校對 change 裡會有 `removeFromFolder`／`deleteAssets` 這種資料層變更。

## Open Questions

- 非同步生成進度卡（圖庫格線內的進度條＋頂部「任務」徽章數字）要怎麼安排：獨立開一個新的 change（可能要同時涵蓋 `home-workbench-ui` 與 `library-management-ui` 兩個 capability），還是等 `sync-mv-01-design` 其他部分收尾後再併進來？這會影響「任務」的狀態資料要放在哪一層（例如新增一個共用的 `useTasks` composable）。
