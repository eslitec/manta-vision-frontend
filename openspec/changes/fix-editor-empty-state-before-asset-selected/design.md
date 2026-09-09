## Context

`src/components/ImageEditorWorkspace.vue` 目前把「原圖圖層永遠存在」當成一個隱含假設，散落在好幾個地方：

- `layers = reactive<EditorLayer[]>([{ key: 'original', ... }])`（第 777 行）：無條件建立
- `selectedLayerKey = ref('original')`（第 778 行）：初始值直接指向這筆一定存在的圖層
- `originalLayer = computed(() => layers.find(l => l.key === 'original')!)`（第 798 行）：用非空斷言 `!`，假設一定找得到
- 樣板第 117 行 `template(v-if="originalLayer.visible")`：直接存取 `.visible`，不是透過 `v-for` 迭代、也沒有做「找不到就跳過」的保護，一旦 `originalLayer` 真的變成 `undefined`，這裡會在執行期噴錯
- `toggleOriginalLock`（第 921-923 行）：直接寫 `originalLayer.value.locked = ...`
- `moveLayerBefore`（806 行）、`startLayerDrag`（816 行）、`handleLayerOrderKeydown`（843 行）：用字面比較 `'original'` 判斷是否為原圖圖層／算出「原圖之前」的可移動範圍，這幾處已經是用字串比較加防呆（`findIndex` 找不到回傳 -1，既有的 `< 0` 判斷本來就會擋住），不需要額外修改

這次要把「原圖圖層」從「元件掛載就無條件存在」改成「使用者真的選定素材後才存在」，上面這幾個假設都要一併處理，否則畫面會在真正沒有素材的空狀態下直接噴出執行期錯誤（存取 `undefined.visible`）。

## Goals / Non-Goals

**Goals:**

- 使用者進入編輯器、還沒有選定素材時，畫面是真正的空狀態：沒有假標題、沒有假圖層、清楚的引導文字與唯一的「從圖庫選擇」入口
- 選定真實素材後，標題、圖層清單、工具列都正確恢復成目前的正常行為（沿用既有邏輯，不重新設計）

**Non-Goals:**

- 不改變 `ImagePickerDialog`、拖放上傳、文字/物件圖層在空狀態下的行為（詳見 proposal.md）
- 不改變選定素材之後的既有編輯／儲存邏輯

## Decisions

### 決策 1：`selectedAssetName` 初始值改為空字串

拿掉 `t('editor.demoAsset')` 這個假的初始值，改成 `ref('')`，跟 `selectedAssetUrl` 一致，讓「有沒有選定素材」統一用「字串是否為空」判斷。

### 決策 2：「原圖」圖層改成選定素材當下才建立，`layers` 初始值為空陣列

`layers` 初始值改成 `reactive<EditorLayer[]>([])`。`selectEditorAsset(asset)`（第 430 行）除了設定 `selectedAssetName`／`selectedAssetUrl`／`selectedAssetId`，還要額外建立一筆原圖圖層並 push 進 `layers`（`{ key: 'original', type: 'original', visible: true, locked: true }`，沿用原本的欄位值），同時把 `selectedLayerKey.value` 設成 `'original'`（讓選定素材後，原圖圖層自動成為選取狀態，符合直覺）。

若使用者反覆點擊「從圖庫選擇」更換素材（不是只有第一次），SHALL 更新既有那筆原圖圖層的內容而不是重複新增一筆——用「`layers` 裡是否已經有 `key === 'original'` 的項目」判斷：有就地更新，沒有才 push 新的。

### 決策 3：`originalLayer` computed 拿掉非空斷言，改成可能是 `undefined`

```
const originalLayer = computed(() => layers.find((layer) => layer.key === 'original'))
```

回傳型別變成 `EditorLayer | undefined`。所有讀取 `originalLayer.value.xxx` 的地方都要改成 `originalLayer.value?.xxx`：

- 樣板第 117 行 `template(v-if="originalLayer.visible")` 改成 `template(v-if="originalLayer?.visible")`
- `toggleOriginalLock`（921-923 行）開頭加 `if (!originalLayer.value) return`，或全部改用 `?.`——因為這個函式是鎖定/解鎖按鈕的 click handler，而鎖定按鈕本來就只會在圖層清單有原圖那一列時才渲染出來，理論上呼叫得到這個函式時 `originalLayer.value` 一定存在，但仍要在型別層面正確處理 `undefined`，避免 TypeScript 型別檢查出錯

### 決策 4：`selectedLayerKey` 初始值改為空字串，代表「沒有任何圖層被選取」

```
const selectedLayerKey = ref('')
```

`selectedLayer` computed（`layers.find(layer => layer.key === selectedLayerKey.value)`）在空狀態下自然回傳 `undefined`，既有依賴 `selectedLayer.value?.type` 的地方（例如 `canDuplicateSelectedLayer`）已經用了 optional chaining，不需要額外修改；但要檢查其餘直接使用 `selectedLayerKey`/`selectedLayer` 而沒有做 `undefined`／空字串防呆的地方（例如任何直接假設「一定有選取圖層」的樣板條件），逐一確認在空狀態下不會出錯。

### 決策 5：標題列與工具列依「是否已選定素材」條件顯示／停用

新增一個 computed（例如 `hasSelectedAsset = computed(() => !!selectedAssetId.value)` 或沿用 `selectedAssetUrl`，取其中一個已存在、能正確代表「有沒有選定」的 ref，不重複定義兩個語意相同的旗標）：

- 標題列：`hasSelectedAsset` 為假時，標題文字位置改顯示新增的空狀態文案 key（見決策 7），「狀態：已編輯」徽章、換頁箭頭、「另存為新素材」按鈕 SHALL 加上 `v-if="hasSelectedAsset"` 隱藏
- 左側工具列（背景移除／加入物件／文字／裁切，含 `retouch` 模式對應的工具列按鈕）：`hasSelectedAsset` 為假時 SHALL 加上 `disabled` 屬性與對應的停用樣式（沿用專案既有 disabled 按鈕的樣式慣例，不新增一套新樣式）
- 「從圖庫選擇」／「上傳圖片」按鈕不受 `hasSelectedAsset` 影響，維持一律可見可用

### 決策 6：畫布空狀態加上引導文字，不新增額外的點擊區域

灰色示意圖示（`IconImagePlaceholder`）下方加一行文字（新增的空狀態文案 key，見決策 7），純文字說明，不綁定 `@click`——維持決策 3（沿用「從圖庫選擇」既有按鈕當唯一入口）的取捨，不做重複的互動入口。

### 決策 7：新增空狀態文案 i18n key

`src/lang/zh-Hant.ts`／`en.ts` 新增（比照既有 `editor.*` 命名慣例，兩邊 key 結構一致）：
- `editor.emptyState.title`：標題列在空狀態顯示的文字，例如「尚未選擇素材」
- `editor.emptyState.canvasHint`：畫布引導文字，例如「請點擊上方「從圖庫選擇」開始編輯」

## Implementation Contract

**行為**：使用者進入「編輯圖片」／「AI 修圖」分頁、尚未選定素材時：
1. 標題列顯示 `editor.emptyState.title`，不顯示任何素材名稱
2. 「狀態：已編輯」徽章、換頁箭頭（‹ ›）、「另存為新素材」按鈕 SHALL NOT 顯示
3. 畫布顯示灰色示意圖示＋`editor.emptyState.canvasHint` 引導文字
4. 圖層清單 SHALL 為空（沒有任何項目，包含沒有「原圖」）
5. 左側工具列（背景移除／加入物件／文字／裁切）SHALL 呈現停用狀態，點擊無效果；「從圖庫選擇」／「上傳圖片」維持可點擊

使用者點擊「從圖庫選擇」並選定一個真實素材後：
1. 標題列顯示這個素材的真實名稱，「狀態：已編輯」徽章、換頁箭頭、「另存為新素材」按鈕 SHALL 恢復顯示（依既有邏輯，不因這次改動而改變它們原本各自的顯示條件，只是不再被空狀態額外蓋住）
2. 圖層清單新增一筆「原圖：{真實名稱}」，SHALL 自動成為目前選取的圖層
3. 左側工具列恢復可點擊
4. 使用者若在同一次編輯工作階段再次點擊「從圖庫選擇」換成另一個素材，圖層清單的「原圖」那一筆 SHALL 就地更新成新素材的名稱，SHALL NOT 疊加出第二筆原圖圖層

**資料形狀**：`layers` 的元素型別（`EditorLayer`／`ObjectEditorLayer`）不變，只改變初始值與建立時機。`originalLayer` computed 回傳型別從隱含的 `EditorLayer` 改為明確的 `EditorLayer | undefined`。

**失敗模式**：`originalLayer.value` 為 `undefined` 時，所有讀取它屬性的地方 SHALL 使用 optional chaining 或前置防呆判斷，SHALL NOT 讓 TypeScript 編譯或執行期因為存取 `undefined` 的屬性而出錯。

**驗收標準**：
- `npx vue-tsc --noEmit` 通過（確認 `originalLayer` 型別改變後，所有呼叫點都正確處理 `undefined`）
- 瀏覽器手動驗證空狀態五個項目（標題、徽章/箭頭/另存按鈕隱藏、畫布引導文字、圖層清單為空、工具列停用）
- 瀏覽器手動驗證選定素材後五個項目正確恢復，且圖層清單「原圖」名稱正確
- 瀏覽器手動驗證「重新選擇另一個素材」時，原圖圖層是就地更新而不是疊加出第二筆

**範圍邊界**：僅限 `src/components/ImageEditorWorkspace.vue`、`src/lang/zh-Hant.ts`、`src/lang/en.ts`。不修改 `ImagePickerDialog.vue`、`LibraryView.vue`、`useAssets.ts`、`api/real.ts`。

## Risks / Trade-offs

- [風險] `layers` 改成可能為空陣列，任何後續新功能如果沒注意到這個假設變化（例如新增另一個直接對 `layers[0]` 或非空斷言存取的功能），容易重新踩到同一個坑 → [緩解] 這次已經把 `originalLayer` computed 的型別明確標成 `EditorLayer | undefined`，TypeScript 會在編譯期強制之後的呼叫點處理這個可能性，不會悄悄退化回無保護的假設
- [風險] `retouch`（AI 修圖）模式的工具列結構如果跟 `edit` 模式不完全一樣，決策 5 的「停用工具列」邏輯可能需要針對 `retouch` 模式的實際按鈕清單分別調整 → [緩解] 實作時個別確認 `retouch` 模式當下實際渲染的按鈕清單，套用同樣的 `hasSelectedAsset` 條件，不假設兩個模式的按鈕結構完全相同
