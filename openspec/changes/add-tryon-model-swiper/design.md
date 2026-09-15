## Context

`src/views/TryOnView.vue` 第 19-25 行「內建模特庫」目前用完全寫死的 `models` computed（第 149-154 行：`['femaleCasual','maleFormal','femaleSport','femaleElegant']` 四個固定字串），每個永遠顯示 `IconImagePlaceholder`，不是真實圖片，CSS 是固定 `repeat(4, 1fr)` 的 4 欄 grid，沒有分頁/輪播機制。「檢視完整模特庫（內建 12 位）」是 `button.link`，完全沒有掛 `@click`，「12 位」是寫死文字，跟任何真實資料無關。

`src/types/asset.ts` 的 `Material.category` 型別已經包含 `'model'`，`api.listMaterials(category?)` 在 mock 與 real 兩邊都已經支援依分類篩選、端到端打通，但 `src/api/mock.ts` 的 `MATERIALS` 陣列目前完全沒有 `category: 'model'` 的項目（真後端這個分類也是空的）。

專案完全沒有安裝任何輪播套件，`src/` 底下也沒有手刻的輪播/滑動元件可以重用。「選擇服飾素材」段落用的 `ImagePickerDialog.vue` 查的是 `Asset`（使用者圖庫圖片），沒有分類篩選概念，不適合拿來當模特選擇器——使用者要的也是頁面內建的橫向輪播，不是彈窗選圖。

## Goals / Non-Goals

**Goals:**

- 「內建模特庫」顯示真實的模特素材縮圖，一次 4 個，可以左右滑動瀏覽更多
- 「檢視完整模特庫」的筆數文字反映真實資料，不再寫死假數字

**Non-Goals:**

- 不新增/播種正式後端的 model 類材料資料（proposal.md 已說明）
- 不做「檢視完整模特庫」的完整瀏覽/篩選彈窗
- 不改動「上傳模特照」分頁與「選擇服飾素材」段落

## Decisions

### 決策 1：新增 `swiper` npm 依賴，使用官方 `swiper/vue` 元件整合

使用者明確指定要用 Swiper，且專案內沒有既有的輪播實作可以重用，這是使用者指定工具、不是重造輪子。用官方提供的 Vue 元件（`Swiper`／`SwiperSlide`，從 `swiper/vue` 匯入），搭配 `swiper/css`／`swiper/css/navigation` 樣式檔案，風格上比原生 Web Component 版本更貼近這個專案其他地方用 Vue SFC 元件組合 UI 的方式。

### 決策 2：`slidesPerView: 4` ＋ Swiper Navigation 模組

Swiper 的 `slidesPerView: 4` 直接滿足「一次只顯示 4 個」；啟用 Swiper 內建的 `Navigation` 模組提供左右箭頭按鈕，加上 Swiper 預設就支援的觸控/滑鼠拖曳滑動，同時滿足「左右滑動」的需求，不需要另外手刻滑動手勢邏輯或箭頭按鈕。

### 決策 3：先幫 mock 資料補上 `category: 'model'` 的素材

`src/api/mock.ts` 的 `MATERIALS` 新增數筆模特素材（比照現有 `background`/`object` 條目的欄位形狀：`materialId`、`materialName`、`category`、`url`、`width`、`height`），這樣本機開發／測試才有真的資料可以在 Swiper 裡顯示。新增幾筆的確切數量以「至少超過 4 筆」為原則（讓輪播的左右滑動有實際意義可以驗證），不強求剛好等於畫面上某個寫死的數字——這正是這次要修正的「數字造假」問題本身。

### 決策 4：`TryOnView.vue` 改成非同步載入模特素材，取代寫死的 `models` computed

比照 `LibraryView.vue` 呼叫 `api.listMaterials()` 的既有寫法（直接呼叫，不透過共用 composable，因為目前只有這一個新的呼叫點，跟圖庫頁的呼叫方式不共用狀態），新增一個 `ref<Material[]>([])` 搭配 `onMounted` 呼叫 `api.listMaterials('model')` 寫入；`model`（目前選取的模特）改成存選取素材的 `materialId`，模板裡的縮圖改用素材的 `url`。

### 決策 5：「檢視完整模特庫」文字改成動態筆數，連結行為維持不變（仍然是死的，但不再說謊）

只修正文字裡的數字造假問題（`t('tryOn.viewFullLibrary', { count: models.length })`），連結本身要不要真的可以點擊、點了要做什麼，列為 Non-Goal——這是刻意縮小這次的範圍，避免順手做出一個完整的「模特庫瀏覽彈窗」功能超出使用者原本的請求。

## Implementation Contract

**行為**：使用者進入 AI 試穿工作台，「選擇模特」步驟預設在「內建模特庫」分頁時，SHALL 顯示 4 個真實模特素材的縮圖（來自 `api.listMaterials('model')`），可以透過左右箭頭按鈕或觸控/滑鼠拖曳滑動查看其餘素材；點擊任一素材縮圖 SHALL 將其標記為選取狀態，作為這次試穿要使用的模特（沿用既有 `model` 選取狀態的資料流，只是改成存素材的識別碼而不是寫死的字串）。「檢視完整模特庫」旁的筆數文字 SHALL 顯示 `api.listMaterials('model')` 實際回傳的筆數。

**資料形狀**：`api.listMaterials('model')` 回傳 `Material[]`（既有型別，`materialId`／`materialName`／`category`／`url`／`width`／`height`），不新增型別。

**失敗模式**：`api.listMaterials('model')` 呼叫失敗或回傳空陣列時（例如真後端目前這個分類本來就是空的），畫面 SHALL 顯示「目前沒有內建模特」之類的空狀態文字，SHALL NOT 顯示壞掉的 Swiper（例如空白輪播或錯誤訊息外洩到畫面上）。

**驗收標準**：
- 瀏覽器手動驗證：進入 AI 試穿工作台，「內建模特庫」分頁顯示真實素材縮圖（不是灰色示意圖示），一次 4 個
- 可以透過左右箭頭或滑動看到更多素材（mock 資料筆數 > 4 時）
- 點擊素材可以標記選取狀態
- 「檢視完整模特庫」文字顯示的筆數與 `api.listMaterials('model')` 實際回傳筆數一致
- `npm run lint` 與 `npx vue-tsc --noEmit` 通過

**範圍邊界**：僅限 proposal.md Impact 列出的檔案。不修改 `ImagePickerDialog.vue`、「上傳模特照」分頁的既有邏輯、`src/api/real.ts`。

## Risks / Trade-offs

- [風險] 新增 `swiper` 這個外部依賴會增加打包體積 → [緩解] 這是使用者明確指定的工具選擇，且只在試穿頁面這一處使用，透過既有的 route-level code splitting（`TryOnView.vue` 本來就是動態 import 的路由元件），不會影響其他頁面的載入體積
- [風險] mock 資料新增的模特素材數量是任意選的，之後如果業務端有明確的示範模特清單，這批資料需要再調整 → [緩解] 只是 mock 資料，改起來成本很低，不影響其他邏輯
