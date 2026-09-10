## Context

`src/components/ImageEditorWorkspace.vue` 的圖層系統有兩種既有架構並存：

- **物件圖層（`ObjectEditorLayer`）**：多實例架構。`layers` 陣列裡可以同時存在多筆 `type==='object'` 的圖層，每一筆自己帶 `x`／`y`／`scale`／`dragging`／`label` 欄位（`addObjectLayer`、`duplicateSelectedLayer`、`startObjectDrag`、`startObjectResize` 都是操作傳入的特定 `layer` 參數，不是全域狀態）
- **文字圖層**：全域單例架構。`insertTextLayer()` 用 `if (!textLayer.value)` 判斷「已經有就不新增」，`layers` 陣列裡最多只有一筆 key 固定是 `'text'` 的圖層；這筆圖層的實際內容（文字、位置、字級、字型、顏色）不在圖層物件裡，而是存在五個模組層級的全域 `ref`：`textContent`、`textColor`、`textPosition`（`reactive`）、`textScale`、`selectedFontId`。畫布渲染（`.textObject`）、右側「文字屬性」面板、拖曳（`startTextDrag`）、縮放（`startTextResize`／`resizeTextBy`）、雙擊編輯（`beginTextEdit`／`finishTextEdit`）全部直接讀寫這五個全域 ref。

`duplicateSelectedLayer()` 現有的判斷 `if (!source || source.type !== 'object') return` 就是這個架構落差的直接後果：物件圖層複製只是「把來源欄位 spread 進一筆新圖層」，因為欄位本來就在圖層物件裡；文字圖層沒有欄位可以 spread（欄位在全域 ref 裡），沒辦法比照同樣的邏輯複製出一筆真正獨立的第二筆。

## Goals / Non-Goals

**Goals:**

- 文字圖層改成跟物件圖層一樣的多實例架構：`layers` 陣列可以同時存在多筆文字圖層，各自有自己的內容／位置／字級／字型／顏色
- 圖層清單「+」按鈕對文字圖層跟物件圖層一樣可以複製
- 既有的文字圖層互動（拖曳、縮放、雙擊編輯、字型／顏色選擇）在多實例架構下維持相同的操作體驗，只是換成作用在「使用者當下選取的那一筆」

**Non-Goals:**

- 不改變物件圖層既有的多實例邏輯本身
- 不改變原圖圖層的任何邏輯
- 不新增文字圖層之間的圖層順序／群組等進階功能——複製出的新圖層一律比照物件圖層的做法，用 `unshift` 放到 `layers` 陣列最前面

## Decisions

### 決策 1：新增 `TextEditorLayer` 型別，比照 `ObjectEditorLayer` 的多實例模式

```ts
type TextEditorLayer = EditorLayer & {
  type: 'text'
  content: string
  color: string
  x: number
  y: number
  scale: number
  fontId: FontId
}
```

`FontId` 型別定義（`type FontId = (typeof fontOptions)[number]['id']`）維持不動，只是從全域 `selectedFontId: ref<FontId>` 搬進圖層欄位。

### 決策 2：移除五個全域 ref，改用 `selectedTextLayer` computed 讀寫目前選取圖層的欄位

```ts
const selectedTextLayer = computed(() =>
  selectedLayer.value?.type === 'text' ? (selectedLayer.value as TextEditorLayer) : undefined
)
const textLayers = computed(() => layers.filter((layer): layer is TextEditorLayer => layer.type === 'text'))
```

右側「文字屬性」面板（現有 `.properties(v-if="selectedLayerKey === 'text' && textLayer")`）改成 `v-if="selectedTextLayer"`；面板內的 `input.properties__text` 改成 `v-model="selectedTextLayer.content"`（需要 `selectedTextLayer` 非 `undefined` 時才會渲染這個區塊，模板內可以安全地用 `selectedTextLayer.content` 而不用 `selectedTextLayer?.content`，因為 `v-if` 已經擋掉了 `undefined` 的情況）；字型選單顯示 `t('editor.fontOptions.${selectedTextLayer.fontId}')`、選字型時寫入 `selectedTextLayer.value.fontId = id`；顏色選取器 `v-model="selectedTextLayer.color"`。

### 決策 3：畫布改成 `v-for` 渲染所有文字圖層，比照 `.objectObject` 的既有模式

```pug
.textObject(
  v-for="layer in textLayers"
  :key="layer.key"
  v-show="layer.visible"
  :class="{ isDragging: layer.key === draggingTextKey, isEditing: layer.key === editingTextKey, isCropPreview: tool === 'crop' }"
  :style="textLayerStyle(layer)"
  @pointerdown.stop="startTextDrag($event, layer)"
)
  span.textObject__content(
    :ref="(el) => setTextObjectRef(layer.key, el)"
    role="textbox"
    ...
    :contenteditable="tool !== 'crop' && editingTextKey === layer.key ? 'true' : 'false'"
    @dblclick.stop="beginTextEdit(layer.key)"
    @keydown="handleTextKeydown($event, layer.key)"
    @blur="finishTextEdit(layer.key)"
  ) {{ layer.content }}
  button.textResizeHandle.textResizeHandle--nw(
    v-if="tool !== 'crop' && editingTextKey !== layer.key"
    ...
    @pointerdown.stop="startTextResize($event, layer, 'nw')"
    @keydown="handleTextResizeKeydown($event, layer)"
  )
  // ne／sw／se 三個角落同樣模式
```

`textDragging`（單一 boolean）改成 `draggingTextKey: ref('')`（記錄正在拖曳的是哪一筆，空字串代表沒有在拖），`textEditing` 改成 `editingTextKey: ref('')`（記錄正在編輯的是哪一筆）——理由：拖曳與編輯狀態本質上是「哪一筆圖層目前處於這個狀態」，跟物件圖層的 `layer.dragging: boolean` 欄位是同一種需求，但文字的雙擊編輯狀態需要知道「是哪一筆在編輯」才能正確控制對應的 `contenteditable` 與 resize handle 顯示，所以用一個記錄 key 的 ref 而不是欄位本身（欄位本身也可以，但 `beginTextEdit`／`finishTextEdit` 需要知道「使用者是不是正在編輯別筆圖層時被打斷」的情境比較單純，用一個全域指標記錄「目前正在編輯中的 key」更直接）。

`textLayerStyle(layer)` 新增：

```ts
const textLayerStyle = (layer: TextEditorLayer) => ({
  left: `${layer.x}%`,
  top: `${layer.y}%`,
  color: layer.color,
  fontFamily: fontOptions.find((option) => option.id === layer.fontId)?.family ?? fontOptions[0].family,
  fontWeight: fontOptions.find((option) => option.id === layer.fontId)?.weight ?? fontOptions[0].weight,
  fontSize: `${1.25 * layer.scale}rem`,
  zIndex: layerZIndex(layer.key),
})
```

### 決策 4：`textObjectRef` 改成 `Map<string, HTMLElement>`，用圖層 key 索引多個 contenteditable 節點

```ts
const textObjectRefs = new Map<string, HTMLElement>()
const setTextObjectRef = (key: string, el: Element | ComponentPublicInstance | null) => {
  if (el instanceof HTMLElement) textObjectRefs.set(key, el)
  else textObjectRefs.delete(key)
}
```

`beginTextEdit(key: string)`／`finishTextEdit(key: string)`／`handleTextKeydown(event: KeyboardEvent, key: string)` 改成用 `textObjectRefs.get(key)` 取得對應的 DOM 節點，取代原本單一的 `textObjectRef.value`；邏輯本身（focus、選取全部文字、`textContent.value = element.textContent`、Enter／Escape 鍵處理）不變，只是操作對象從 `textObjectRef.value` 換成 `textObjectRefs.get(key)`，寫入對象從全域 `textContent.value` 換成 `layers` 裡對應 key 那一筆的 `content` 欄位。

### 決策 5：拖曳／縮放函式改成接收目標圖層，比照 `startObjectDrag`／`startObjectResize` 的既有模式

```ts
const startTextDrag = (event: PointerEvent, layer: TextEditorLayer) => {
  if (editingTextKey.value === layer.key || event.button !== 0 || !artboardRef.value) return
  event.preventDefault()
  selectLayer(layer.key)
  const artboardBounds = artboardRef.value.getBoundingClientRect()
  const textBounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  draggingTextKey.value = layer.key
  textDrag.start({
    containerBounds: artboardBounds,
    elementBounds: textBounds,
    startEvent: event,
    startX: layer.x,
    startY: layer.y,
    onDrag: (x, y) => {
      layer.x = x
      layer.y = y
    },
    onEnd: () => {
      draggingTextKey.value = ''
    },
  })
}
```

`startTextResize(event, layer, corner)`／`handleTextResizeKeydown(event, layer)`／`resizeTextBy(layer, amount)` 比照同樣模式，把原本讀寫 `textScale.value` 的地方換成讀寫 `layer.scale`；`textDrag`／`textResizeDrag` 這兩個共用的 composable 實例（`usePercentDrag()`／`usePointerDrag()`）不需要變成多個實例——物件圖層已經證明「一個共用的 drag composable 實例＋每次呼叫傳入不同 layer 的 callback」這個模式在同一時間只會有一筆圖層被拖曳／縮放的情境下是安全的，文字圖層套用同樣的假設成立。

### 決策 6：`insertTextLayer()` 改成每次都新增一筆新圖層，仿照 `addObjectLayer`

```ts
function addTextLayer() {
  const key = `text-${crypto.randomUUID()}`
  const layer: TextEditorLayer = {
    key,
    type: 'text',
    visible: true,
    locked: false,
    content: t('editor.newTextPlaceholder'),
    color: '#2e3567',
    x: 50,
    y: 58,
    scale: 1,
    fontId: 'notoSansTC',
  }
  layers.unshift(layer)
  selectedLayerKey.value = key
  savedAssetId.value = ''
  return layer
}
const insertTextLayer = async () => {
  tool.value = 'text'
  const layer = addTextLayer()
  await beginTextEdit(layer.key)
}
```

不再判斷「已經有文字圖層就重用」——每次點擊「文字」工具都是新增一筆獨立的圖層，這正是使用者這次需求「文字圖層也能有多筆、可以複製」的直接體現，跟原本「全域只能有一筆」的限制相反。

### 決策 7：`duplicateSelectedLayer()` 放寬到同時支援物件與文字圖層

```ts
function duplicateSelectedLayer() {
  const source = selectedLayer.value
  if (!source || (source.type !== 'object' && source.type !== 'text')) return
  const key = source.type === 'object' ? `object-${crypto.randomUUID()}` : `text-${crypto.randomUUID()}`
  const duplicated =
    source.type === 'object'
      ? ({ ...(source as ObjectEditorLayer), key, dragging: false } as ObjectEditorLayer)
      : ({ ...(source as TextEditorLayer), key } as TextEditorLayer)
  layers.unshift(duplicated)
  selectedLayerKey.value = key
  savedAssetId.value = ''
}
const canDuplicateSelectedLayer = computed(
  () => selectedLayer.value?.type === 'object' || selectedLayer.value?.type === 'text'
)
```

文字圖層複製後不會自動進入編輯狀態（`editingTextKey` 維持不變）——這跟物件圖層複製後也不會自動進入任何特殊模式一致，複製出來的圖層先以複本形式存在，使用者需要再手動雙擊才會進入編輯，避免複製動作意外把使用者導向編輯模式、蓋掉原本正在做的操作。

### 決策 8：`layerLabel`／未儲存狀態偵測，改讀圖層自己的欄位

`layerLabel(layer)` 裡文字圖層分支：

```ts
if (layer.type === 'text') return t('editor.layerItems.text', { text: (layer as TextEditorLayer).content })
```

既有那段 `watch([textContent, textColor, textScale, selectedFontId, tool, retouchInstruction, ...], () => { savedAssetId.value = ''; ... })` 改成：

```ts
const textLayersFingerprint = computed(() =>
  layers
    .filter((layer): layer is TextEditorLayer => layer.type === 'text')
    .map((layer) => `${layer.key}:${layer.content}:${layer.color}:${layer.scale}:${layer.fontId}:${layer.x}:${layer.y}`)
    .join('|')
)
watch(
  [textLayersFingerprint, tool, retouchInstruction, /* 其餘既有項目不變 */],
  () => {
    savedAssetId.value = ''
    saveError.value = false
    saveErrorMessage.value = ''
  },
)
```

## Implementation Contract

**行為**：使用者點擊「文字」工具，SHALL 新增一筆新的文字圖層（不覆蓋既有的文字圖層），並立即進入雙擊編輯狀態讓使用者輸入內容。圖層清單裡選取任一文字圖層後，「+」按鈕 SHALL 變成可點擊，點擊後 SHALL 複製出一筆內容／位置／字級／字型／顏色都相同、key 不同的新文字圖層。每一筆文字圖層 SHALL 能各自獨立拖曳移動、縮放、雙擊編輯內容、切換字型、切換顏色，操作其中一筆 SHALL NOT 影響其他筆的狀態。

**資料形狀**：新增 `TextEditorLayer` 型別（見決策 1）。`layers` 陣列的既有型別 `EditorLayer[]` 不變，只是新增一種可能的成員型態。移除 `textContent`／`textColor`／`textPosition`／`textScale`／`selectedFontId` 五個模組層級的 `ref`／`reactive`。

**失敗模式**：`selectedTextLayer` 為 `undefined` 時（沒有選取任何文字圖層，或選取的是別種圖層），右側「文字屬性」面板 SHALL NOT 渲染，SHALL NOT 讓 `v-model` 綁定到 `undefined` 導致執行期錯誤——已透過 `v-if="selectedTextLayer"` 的模板結構保證這一點。`beginTextEdit`／`finishTextEdit` 在對應 key 於 `textObjectRefs` 找不到 DOM 節點時（理論上不應發生，因為節點跟圖層一起被 `v-for` 渲染出來），SHALL 直接返回，SHALL NOT 拋出例外。

**驗收標準**：
- 瀏覽器手動驗證：新增兩筆獨立的文字圖層，圖層清單同時看得到兩筆各自內容不同的「文字：xxx」項目
- 瀏覽器手動驗證：選取其中一筆按「+」複製，複製出的第三筆內容相同，移動／編輯任一筆不影響其他筆
- 瀏覽器手動驗證：每一筆文字圖層的拖曳、縮放、雙擊編輯、字型切換、顏色切換都正確作用在該筆自己身上
- 瀏覽器手動驗證：既有的「加入物件」圖層複製功能沒有被這次改動影響
- `npx vue-tsc --noEmit`、`npm run lint` 通過

**範圍邊界**：僅限 `src/components/ImageEditorWorkspace.vue`。不修改物件圖層、原圖圖層既有邏輯，不修改「加入物件」「背景移除」「裁切」工具本身跟文字圖層無關的邏輯。

## Risks / Trade-offs

- [風險] 這次改動觸及畫布渲染、右側面板、拖曳、縮放、雙擊編輯共五個既有互動點，範圍比一般的樣式修正大很多，任何一處遺漏沒有從全域 ref 改成圖層欄位，都會在多筆文字圖層並存時出現「改一筆、其他筆跟著變」的殘留單例 bug → [緩解] 實作時逐一比對本文件決策 2-8 列出的每個函式／模板區塊，確認沒有遺漏任何一處仍讀寫 `textContent`／`textColor`／`textPosition`／`textScale`／`selectedFontId`；`npx vue-tsc --noEmit` 會在這些 ref 被移除後，對任何還在引用它們的地方報型別錯誤，作為機械式的漏改檢查
- [風險] `textObjectRefs` 用一般 `Map`（不是 Vue 的 `ref`）管理多個 DOM 節點，`v-for` 裡的函式型 `:ref` 綁定在圖層被刪除／重新排序時需要正確清除對應的 Map 項目，否則可能累積失效的 DOM 參照 → [緩解] `setTextObjectRef` 函式在 `el` 為 `null`（Vue 卸載節點時的既有行為）時執行 `Map.delete`，避免累積殘留參照
