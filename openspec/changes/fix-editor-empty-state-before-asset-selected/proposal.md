## Problem

圖片編輯器初次進入「編輯圖片」或「AI 修圖」分頁時，使用者還沒有選擇任何素材，畫面卻已經顯示假的標題「春季主視覺_01」、圖層面板裡已經有一筆假的「原圖：春季主視覺_01」——看起來像是已經載入了一張圖片，但畫布區域其實只顯示灰色的示意圖示，什麼真實內容都沒有。

## Root Cause

`src/components/ImageEditorWorkspace.vue` 在全專案只有一處使用（`src/views/LibraryView.vue:139`），只傳入 `mode`，從來不會帶入任何素材 id 或 url——使用者點「編輯圖片」／「AI 修圖」分頁時，這個元件永遠是在「完全沒有素材」的狀態下掛載，真正載入素材唯一的方式是之後手動點擊「從圖庫選擇」。

- `selectedAssetName`（第 411 行）初始值是 `ref(t('editor.demoAsset'))`，一個寫死的示範字串「春季主視覺_01」，沒有對應「空」的處理，直接被用在標題、圖片 `alt`、另存新素材預設檔名建議、以及圖層名稱（`layerLabel` 用 `selectedAssetName.value` 動態組出「原圖：{name}」，這是前一輪 `fix-editor-layer-names-dynamic` 已經修好的邏輯——這次的假名字問題就是「來源本身在沒有素材時就是假的」，不是 `layerLabel` 邏輯有錯）
- `layers`（第 777 行）初始值是 `reactive([{ key: 'original', type: 'original', visible: true, locked: true }])`，一個無條件建立的陣列字面值，沒有任何條件判斷跳過「原圖」這筆圖層，即使根本沒有素材也照樣存在
- 對照組：`selectedAssetUrl`（第 415 行）初始值是真的空字串 `ref('')`，畫布的 `img.editorSourceImg(v-if="selectedAssetUrl" ...)` 搭配灰色示意圖示（第 15-16、62-63、118-119 行）已經正確處理「沒有網址＝顯示灰色示意圖示」——只有「名稱」與「圖層」這兩條線沒有跟著做同樣的「空」處理

參考 Canva、Figma、Photopea 等設計工具，以及一般空狀態 UX 慣例：文件真正開啟／選定之前，不會顯示假的圖層或假的檔名，只會呈現清楚的引導文字與主要行動按鈕；圖層清單只有在文件真正建立之後，才會出現對應該文件的第一筆圖層。

## Proposed Solution

1. `selectedAssetName` 初始值改成空字串 `ref('')`，不再用 `t('editor.demoAsset')` 當初始值
2. `layers` 初始值改成空陣列 `reactive<EditorLayer[]>([])`；「原圖」這筆圖層改成在 `selectEditorAsset(asset)` 選定真實素材的當下才建立並 push 進去，使用選定素材的真實名稱／id
3. 同步檢查並調整所有假設「`layers` 裡一定有一筆 `key === 'original'`」的既有邏輯（`originalLayer` computed、鎖定/解鎖、防止移動 `'original'` 圖層的判斷、`selectedLayerKey` 初始值），改成能正確處理「還沒有任何圖層」的情況
4. 畫布灰色示意圖示旁邊加上引導文字（例如「尚未選擇要編輯的素材，請點擊上方「從圖庫選擇」開始」），沿用既有「從圖庫選擇」按鈕當唯一入口，不新增重複的點擊區域
5. 沒有素材時，標題列的「狀態：已編輯」徽章、上一張／下一張換頁箭頭、「另存為新素材」按鈕 SHALL 隱藏
6. 沒有素材時，左側工具列（背景移除／加入物件／文字／裁切，`retouch` 模式若有對應工具列也適用同樣邏輯）SHALL 呈現停用樣式且不可點擊；「從圖庫選擇」／「上傳圖片」維持啟用，是唯一能離開空狀態的入口

## Non-Goals

- 不改變「從圖庫選擇」彈窗（`ImagePickerDialog`）本身的行為或樣式
- 不新增畫布本身可拖放上傳的功能（drag-and-drop），這次只處理既有按鈕流程的空狀態呈現
- 不處理「文字」圖層／「物件」圖層在空狀態下的行為——這兩種圖層本來就只在使用者主動點擊對應工具才會建立，工具列停用後使用者本來就觸發不到，不受這次改動額外影響
- 不改變已經選定素材之後的既有編輯／儲存邏輯

## Success Criteria

- 使用者進入「編輯圖片」分頁、還沒有選擇素材時：標題顯示引導文字（不是假檔名）、畫布顯示灰色示意圖示＋引導文字、圖層清單是空的（沒有任何「原圖」圖層）、狀態徽章／換頁箭頭／另存為新素材按鈕不顯示、左側工具列（背景移除／加入物件／文字／裁切）呈現停用狀態
- 使用者點擊「從圖庫選擇」並選定一個真實素材後：標題與圖層清單的「原圖」名稱都正確顯示這個素材的真實名稱、工具列恢復可用、狀態徽章與另存為新素材按鈕恢復顯示
- 選定素材後，新增文字圖層、物件圖層的既有動態命名行為（`fix-editor-layer-names-dynamic` 已修好的邏輯）維持正確，沒有被連帶改壞

## Impact

- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue
  - Modified: src/lang/zh-Hant.ts
  - Modified: src/lang/en.ts
