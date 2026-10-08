## Context

`src/components/ImageEditorWorkspace.vue` 的圖層清單面板（`aside.layers`）標題列右側有一顆「+」按鈕（對應 Figma `panel_layers` node `1141:942`），目前的 Pug template 是：

```
h3 {{ t('editor.layers') }} #[button(:aria-label="t('editor.layers')"): IconAddObject]
```

這顆按鈕沒有任何 `@click` 綁定，點擊完全沒有效果；`aria-label` 也誤用了面板標題（`editor.layers`，「圖層」）而非描述按鈕自身動作。

圖層資料模型（`EditorLayer` / `ObjectEditorLayer`，型別定義在同檔案）目前有三種 `type`：

- `'original'`：`layers` 陣列初始化時唯一一筆種子資料，`locked: true`；`moveLayerBefore()` 與 `handleLayerOrderKeydown()` 都明確擋掉 `key === 'original'` 的搬移；沒有任何刪除操作。
- `'text'`：透過 `insertTextLayer()` 建立；`textLayer = computed(() => layers.find(layer => layer.type === 'text'))` 以 `find`（非 `filter`）取得，且 `insertTextLayer()` 內部邏輯是「`if (!textLayer.value)` 才 `unshift` 新的，否則重用既有的」——這是目前程式碼裡真實存在、非假設的單例限制。
- `'object'`：透過 `addObjectLayer(description: string)` 建立，`objectLayers = computed(() => layers.filter(...))` 允許多筆同時存在。`addObjectLayer()` 的建立方式：

  ```ts
  function addObjectLayer(description: string) {
    const key = `object-${crypto.randomUUID()}`
    const layer: ObjectEditorLayer = {
      key,
      type: 'object',
      visible: true,
      locked: false,
      label: t('editor.objectLayerDynamic', { name: description }),
      x: objectSelection.x,
      y: objectSelection.y,
      scale: 1,
      dragging: false,
    }
    layers.unshift(layer)
    selectedLayerKey.value = key
    savedAssetId.value = ''
  }
  ```

`selectedLayerKey` 是目前選取圖層的 key（`ref('original')` 起始值，可能不對應任何圖層存在時視為「無選取」由呼叫端自行處理——本次以 `layers.find(l => l.key === selectedLayerKey.value)` 找不到視為無選取）。

## Goals / Non-Goals

**Goals:**

- 把「+」按鈕接上「複製目前選取的圖層」這個明確、可觀察的行為。
- 依圖層型別決定按鈕的啟用／停用狀態：`'object'` 圖層可複製，`'original'`／`'text'` 圖層與無選取狀態下停用。
- 複製出的新物件圖層取得全新且唯一的 `key`，插入方式與既有 `addObjectLayer()` 一致（`layers.unshift(...)`），並在複製完成後成為選取中的圖層。
- 修正按鈕既有的 `aria-label` 誤用面板標題的問題，改用描述複製動作本身的新 i18n key。

**Non-Goals:**

- 不支援複製 `'original'` 圖層（其鎖定／不可搬移／不可刪除的單例模型不適用複製語意）。
- 不支援複製 `'text'` 圖層（現有程式碼將文字圖層當作單例，複製會產生第二個 `type === 'text'` 圖層並破壞 `textLayer` computed 以 `find` 取得單一圖層的假設；本次不處理「文字圖層允許多個」這個更大的既有限制）。
- 不新增任何圖層刪除／重新命名操作。
- 不變更 `generateObjectFromDescription()` 的 AI 生成流程本身。
- 不強制抽出共用的「clone helper」——是否新增一個小型 `cloneObjectLayer()` / `duplicateSelectedLayer()` 輔助函式，由實作階段依可讀性判斷，`insertTextLayer()`／`addObjectLayer()` 自身的建立邏輯不因此變更。

## Decisions

### 「+」按鈕改為呼叫 `duplicateSelectedLayer()`

新增一個函式 `duplicateSelectedLayer()`，取代目前完全沒有綁定的按鈕行為。按鈕模板改為：

```
button(:aria-label="t('editor.duplicateLayer')" :disabled="!canDuplicateSelectedLayer" @click="duplicateSelectedLayer"): IconAddObject
```

其中 `canDuplicateSelectedLayer` 是一個新增的 computed，判斷依據見下一項決策。

**替代方案考量**：曾考慮讓「+」按鈕改為捷徑呼叫既有的「加入物件」流程（等同再點一次工具列的物件工具）——否決，因為使用者需求明確是「複製目前選取的圖層」，且該按鈕在圖層面板標題列的位置語意上更貼近「針對目前這份清單／目前選取項目的操作」，與另開一個生成流程的心智模型不同。

### 依圖層型別決定啟用狀態：`canDuplicateSelectedLayer`

```ts
const selectedLayer = computed(() => layers.find((layer) => layer.key === selectedLayerKey.value))
const canDuplicateSelectedLayer = computed(() => selectedLayer.value?.type === 'object')
```

- 找不到對應圖層（無選取，或 `selectedLayerKey` 指向不存在的 key）→ `selectedLayer.value` 為 `undefined` → `canDuplicateSelectedLayer` 為 `false` → 按鈕停用。
- `type === 'original'` → `false` → 停用。
- `type === 'text'` → `false` → 停用。
- `type === 'object'` → `true` → 啟用。

### 複製沿用 `addObjectLayer()` 既有的 key 產生與插入慣例

`duplicateSelectedLayer()` 只在 `canDuplicateSelectedLayer.value` 為真時執行實際複製（呼叫端也應由 `:disabled` 擋下，但函式本身也做防呆判斷，不假設呼叫者一定守規矩）：

```ts
function duplicateSelectedLayer() {
  const source = selectedLayer.value
  if (!source || source.type !== 'object') return
  const key = `object-${crypto.randomUUID()}`
  const duplicated: ObjectEditorLayer = {
    ...source,
    key,
    dragging: false,
  }
  layers.unshift(duplicated)
  selectedLayerKey.value = key
  savedAssetId.value = ''
}
```

- `key`：沿用 `addObjectLayer()` 的 `` `object-${crypto.randomUUID()}` `` 慣例，確保全新且唯一，絕不重用來源圖層的 key。
- 欄位複製範圍：`label`、`x`、`y`、`scale`、`visible`、`locked` 都從來源圖層複製（`...source` 展開），符合「同一份視覺內容的拷貝」的直覺——複製一個目前被隱藏或鎖定的圖層，拷貝出來的也應該維持隱藏或鎖定，而不是被複製動作意外改變可見性/鎖定狀態。
- `dragging` 明確重置為 `false`：這是暫時性的互動狀態（拖曳中），不是圖層的持久內容，複製出的新圖層不應該繼承來源當下是否正在被拖曳。
- 插入方式：`layers.unshift(duplicated)`，與 `addObjectLayer()` 一致（新圖層固定插入清單最前面／z-index 最上層，跟既有「加入物件」的行為一致，不另外設計「插入到來源圖層旁邊」之類的新規則）。
- 選取狀態：複製完成後 `selectedLayerKey.value = key`，讓新圖層成為選取中的圖層，與 `addObjectLayer()` 的既有行為一致，也讓使用者能立即在畫布上看到剛複製出來、可操作的圖層。
- `savedAssetId.value = ''`：沿用 `addObjectLayer()` 既有慣例（畫布內容變更後，先前「另存為新素材」的已儲存狀態不再有效）。

**替代方案考量**：曾考慮把複製產生的圖層 `push` 到陣列尾端（視覺上疊在最下層）——否決，因為這與 `addObjectLayer()` 既有的 `unshift`／z-index 慣例不一致，且新圖層疊在最下層代表可能被其他圖層遮住，不符合「使用者剛做了複製動作、應該立即看得到並可互動」的直覺。

### `aria-label` 改用新的 i18n key `editor.duplicateLayer`

新增 i18n key `editor.duplicateLayer`，語意為「複製圖層」／"Duplicate layer"，同步新增到 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts`，key 結構與既有 `editor.selectLayer`、`editor.reorderLayer` 等同層級的 key 一致（放在 `editor` namespace 底下的頂層字串，不需要插值參數，因為此按鈕的語意固定是「複製目前選取的圖層」，不像 `editor.selectLayer` 需要帶入圖層名稱）。按鈕的 `:aria-label` 從 `t('editor.layers')` 改為 `t('editor.duplicateLayer')`。

## Implementation Contract

**Behavior**：

- 圖層清單面板標題列的「+」按鈕（Pug 位置：`aside.layers` 內 `h3` 之後的 `button`，圖示為 `IconAddObject`）在以下情況下 SHALL 呈現為停用（`disabled` 屬性為真、無法點擊）：
  1. `selectedLayerKey` 找不到對應的 `layers` 項目（無選取）。
  2. 選取的圖層 `type === 'original'`。
  3. 選取的圖層 `type === 'text'`。
- 選取的圖層 `type === 'object'` 時，按鈕 SHALL 為啟用狀態。點擊後：
  - `layers` SHALL 新增一筆 `ObjectEditorLayer`，其 `label`／`x`／`y`／`scale`／`visible`／`locked` 與來源圖層相同，`dragging` 為 `false`，`key` 為透過 `` `object-${crypto.randomUUID()}` `` 產生的全新字串（不等於來源圖層的 `key`，也不等於陣列中任何既有圖層的 `key`）。
  - 新圖層 SHALL 以 `layers.unshift(...)` 插入（成為陣列第一筆）。
  - `selectedLayerKey` SHALL 更新為新圖層的 `key`（複製完成後新圖層成為選取中的圖層）。
- 按鈕的 `aria-label` SHALL 為 `t('editor.duplicateLayer')`，SHALL NOT 為 `t('editor.layers')`。

**Interface / data shape**：

- 新增 computed：`canDuplicateSelectedLayer: ComputedRef<boolean>`。
- 新增函式：`duplicateSelectedLayer(): void`。
- 新增 i18n key：`editor.duplicateLayer`（`string`，無插值參數），同步新增於 `src/lang/zh-Hant.ts` 與 `src/lang/en.ts`。
- `ObjectEditorLayer` 型別本身不變更；複製邏輯只是建構一個符合既有型別的新物件。

**Failure modes**：

- 若 `duplicateSelectedLayer()` 在 `canDuplicateSelectedLayer.value` 為 `false` 時被呼叫（理論上不會發生，因為模板上 `:disabled` 已擋下，但函式本身也做防呆），函式 SHALL 直接 return，SHALL NOT 修改 `layers` 或 `selectedLayerKey`，也 SHALL NOT 拋出例外或顯示任何錯誤訊息（此為靜默無操作，因為呼叫路徑理論上不可達，不需要對使用者呈現任何提示）。

**Acceptance criteria**：

- `npm run build`（`vue-tsc --noEmit` + `vite build`）通過。
- `npm run lint` 通過。
- 手動／瀏覽器驗證：選取一個物件圖層並點擊「+」按鈕後，`layers` 陣列長度增加一筆、新圖層在陣列最前面、`selectedLayerKey` 等於新圖層的 `key`；選取 `'original'` 或 `'text'` 圖層、或未選取任何圖層時，按鈕呈現 `disabled` 狀態且點擊無效果。
- `aria-label` 檢查：DOM 上該按鈕的 `aria-label` 屬性值等於 `editor.duplicateLayer` 對應的翻譯字串，不等於 `editor.layers` 對應的翻譯字串。

**Scope boundaries**：

- In scope：`src/components/ImageEditorWorkspace.vue` 的「+」按鈕行為與 `aria-label`、新增 `canDuplicateSelectedLayer` / `duplicateSelectedLayer()`、`src/lang/zh-Hant.ts` 與 `src/lang/en.ts` 新增 `editor.duplicateLayer` key。
- Out of scope：`'original'`／`'text'` 圖層的複製、任何圖層刪除／重新命名操作、`generateObjectFromDescription()` 或 `insertTextLayer()`／`addObjectLayer()` 自身建立邏輯的變更（僅可能因程式碼整潔而抽出共用片段，不改變其對外行為）、Figma 視覺樣式調整（`ic_add` 圖示本身已經正確，本次不變更外觀）。

## Risks / Trade-offs

- [Risk] 複製出的新物件圖層與來源圖層座標（`x`／`y`）完全相同，兩者會在畫布上完全重疊，使用者可能誤以為複製沒有效果 → [Mitigation] 複製後新圖層自動成為選取狀態，使用者可以立即透過既有的拖曳／方向鍵重新排序等既有互動自行移動找到它；本次範圍不含「複製時自動位移」這類額外行為，因為使用者的產品決策只要求「同樣的視覺屬性」的拷貝，若之後需要自動位移可在後續 change 另外提出。
- [Risk] `canDuplicateSelectedLayer` 與既有的 `layer.type === 'original'`（鎖定按鈕顯示條件）、`v-else`（排序按鈕顯示條件）等既有條件判斷分散在模板各處，未來若圖層型別增加第四種，容易漏改 → [Mitigation] 本次不做大規模重構，僅新增一個獨立、語意清楚命名的 computed（`canDuplicateSelectedLayer`），不與既有條件判斷共用邏輯，降低耦合；未來型別擴充時的整體重構留給後續 change。
