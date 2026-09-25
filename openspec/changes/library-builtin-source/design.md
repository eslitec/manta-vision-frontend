## Context

`LibraryView.vue` 在 2026-09 為了讓「全部素材」看得到內建素材，做了一套前端合流：`GET /materials` 整批載入、會合流的檢視把使用者圖庫用 `pageSize=100` 迴圈撈完、兩邊在前端切頁、左側計數各自把內建素材加回去。後端 `feat/library-builtin-source` 改成在 `GET /images` 端點內合併（統一 `createdAt DESC` 分頁、`counts.builtin`），前端可以回到單純的伺服器分頁。

## Goals / Non-Goals

- Goals：淨刪除前端合流碼；來源 chip 加「內建素材」；所有數字一律來自後端；內建素材卡片不可選、不進批次操作
- Non-Goals：試穿頁與編輯器物件面板仍走 `GET /materials`；不改 `ImagePickerDialog.vue` 的篩選 pill

## Decisions

### 決策 1：內建素材改由 `GET /images`（#5）回傳、`GET /materials`（#12）只給試穿與編輯器

圖庫頁所有檢視（含「全部素材」）都只打一次分頁的 `GET /images`，不再呼叫 `listMaterials`；後端負責合併、排序、分頁與 `counts`。`GET /materials` 保留給 AI 試穿工作台的「內建模特庫」與編輯器物件面板（它們要依 `category` 分類取整批、不分頁）。替代方案「前端維持合流」被否決：它得整批撈使用者圖庫（100 筆一頁迴圈），量體一大就退化，而且與既有規格「計數 SHALL 採用後端統計」相抵。

### 決策 2：內建素材以來源標籤「內建素材」區分，不再有獨立小標段落

先前用 `.assets__materialsLabel` 一行小字把內建素材那批隔開，前提是它們固定排在前面、且來源標籤顯示的是素材分類（背景／物件／模特）。改由後端統一 `createdAt DESC` 排序後兩者交錯，小標無法成立；改讓卡片 `tag=a.source` 走既有的 `sources.*` i18n，顯示「內建素材」。既有 `library-management-ui` 規格沒有要求小標，可直接移除。

### 決策 3：內建素材 `selectable=false`，批次操作靠「選不到」排除

沿用先前 materials 卡片的做法（`AssetCard :selectable="false"` 不渲染 checkbox），「全選本頁」改只加入 `selectableAssets`（`source !== 'builtin'`）。批次操作全部從 `selectedIds` 取值，內建素材選不到就進不了任何批次，不另外在每個操作加守衛。

### 決策 4：來源 chip 與系統分類的衝突處理沿用 `sourceConflictsWithCategory`

「內建素材」chip 跟「物件素材／AI 生成／編輯產物」系統分類都是 `source` 欄位，同時指定字面上恆為空；沿用既有的衝突判斷讓畫面顯示「沒有符合的素材」、數字歸零，不多送第二個 `source` 值。「影片」分類（`mediaType`）＋「內建素材」chip 會真的送 `mediaType=video&source=builtin`，後端回空清單，行為一致。

### 決策 5：mock `listImages` 把內建素材排在使用者素材之後

mock 的 `db.assets` 沒有 `createdAt`，沒辦法真的照時間排序；後端的實際效果是內建素材最舊、排在使用者自己的圖後面，mock 直接用「使用者素材在前、內建在後」的串接順序模擬同一個效果。

## Risks / Trade-offs

- `add-library-loading-skeleton` 的 delta spec 描述的「合流檢視固定觸發骨架屏」在合流消失後自動成立（所有檢視都清空後查詢），措辭待該 change 歸檔時一併整理
- 「從圖庫選擇」彈窗 `load({ pageSize: 100 })` 現在會包含 32 筆內建素材，使用者素材超過 68 筆時後面的看不到——彈窗本來就沒有分頁 UI，量體到那個程度前先不處理
