## Why

AI 試穿工作台「選擇模特」步驟的「內建模特庫」分頁，目前完全是寫死的假資料：4 個固定字串標籤（「女·休閒」「男·正裝」「女·運動」「女·優雅」），縮圖永遠顯示灰色示意圖示，不是真實的模特照片；「檢視完整模特庫（內建 12 位）」連結也沒有掛任何行為，「12 位」這個數字跟任何真實資料都無關。使用者要求改成串接圖庫的模特素材（`Material.category === 'model'`），畫面一次顯示 4 個，並用 Swiper 套件讓使用者左右滑動選擇更多模特。

## What Changes

- 新增 `swiper` npm 依賴，使用官方 Vue 整合（`swiper/vue` 的 `Swiper`／`SwiperSlide` 元件）
- `src/api/mock.ts` 的 `MATERIALS` 新增數筆 `category: 'model'` 的素材（目前這個分類完全是空的），提供真實資料讓輪播可以顯示
- `src/views/TryOnView.vue` 的「內建模特庫」分頁改成呼叫 `api.listMaterials('model')` 載入真實素材，取代寫死的 `models` computed；用 Swiper 呈現，`slidesPerView: 4`，搭配 Swiper 內建的 Navigation 模組（左右箭頭）與原生觸控/滑鼠拖曳滑動；每張卡片顯示素材縮圖與名稱，點擊選取（沿用既有的選取樣式與互動邏輯）
- 「檢視完整模特庫」文字改成動態顯示真實素材筆數（例如「檢視完整模特庫（內建 N 位）」，N 是 `api.listMaterials('model')` 實際回傳的筆數），不再寫死「12 位」

## Non-Goals

- 不新增/播種正式後端（`real.ts` 串接的真實後端）的 model 類材料資料——那是內容/營運層面的任務，不是這次前端程式碼要處理的問題；真後端目前這個分類也是空的（維持現狀）
- 不做「檢視完整模特庫」點擊後的完整瀏覽/篩選彈窗——這次只修正目前寫死的筆數文字，連結本身要不要真的可以點擊、點了要做什麼，留給之後有需要時再開一個新的 change 規劃
- 不改動「上傳模特照」分頁（`modelTab === 'upload'`）的既有邏輯
- 不改動「選擇服飾素材」段落與 `ImagePickerDialog.vue`（那是查 `Asset` 不是 `Material`，用途不同，這次不動）

## Capabilities

### Modified Capabilities

- `tryon-ui`：「內建模特庫」改為顯示真實模特素材並支援 Swiper 輪播選擇

## Impact

- Affected specs: tryon-ui
- Affected code:
  - Modified: package.json（新增 `swiper` 依賴）
  - Modified: src/views/TryOnView.vue
  - Modified: src/api/mock.ts
  - Modified: src/lang/zh-Hant.ts
  - Modified: src/lang/en.ts
