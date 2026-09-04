## Context

src/components/ImageEditorWorkspace.vue 目前 2547 行。script 區段（296-1027 行）裡有 5 個獨立的拖曳／縮放 handler：startTextDrag、startObjectDrag、startObjectResize、startTextResize、startCropResize。每個都手寫同一段 window pointermove/pointerup 監聽的綁定與清理樣板，各自搭配一個模組層級的 cleanup 變數：textDragCleanup、objectInteractionCleanup、textResizeCleanup、resizeCleanup。其中 objectInteractionCleanup 是唯一被兩個 handler（startObjectDrag 與 startObjectResize）共用的 cleanup 變數——這代表目前設計假設同一時間只會有一個「物件圖層互動」在進行，不區分是拖曳還是縮放，兩者互斥。startTextDrag 與 startObjectDrag 的 onMove 數學（把指標位移換算成容器百分比、依元素半寬高夾限）幾乎逐字相同。

## Goals / Non-Goals

**Goals:**

- 抽出 usePointerDrag() 處理 window pointer 事件綁定與清理的樣板。
- 抽出 usePercentDrag() 處理 startTextDrag 與 startObjectDrag 共用的百分比位置拖曳數學。
- 保留現有 4 個 cleanup 槽位的語意，包括 objectInteractionCleanup 目前被 startObjectDrag 與 startObjectResize 共用（互斥）這件事，不讓行為在重構後變成 5 個互不相關的獨立槽位。

**Non-Goals:**

- 不改變 startObjectResize（距離換算縮放）、startTextResize（單軸位移換算縮放）、startCropResize（四角各自夾限規則）的 onMove 數學本身，只換底層事件綁定機制。
- 不處理 ObjectCorner 與 CropCorner 型別重複。
- 不處理檔案內的 SCSS style 區塊。

## Decisions

### 決策 1：usePointerDrag() 只封裝事件綁定與清理，不含任何座標數學

`usePointerDrag()` 回傳 `{ start(onMove, onEnd?), stop() }`。`start` 內部行為：

1. 先呼叫目前存活的清理函式（若有）。
2. 建立 `onUp`：移除 `pointermove`／`pointerup` 監聽、清空內部清理參照、呼叫 `onEnd?.()`。
3. 把 `onUp` 存成內部清理參照。
4. `window.addEventListener('pointermove', onMove)`。
5. `window.addEventListener('pointerup', onUp, { once: true })`。

`stop()` 呼叫內部清理參照（若有）。這與現有 5 個 handler 裡的 onUp/cleanup 樣板逐行對應，行為零差異。

**替代方案**：把座標數學也塞進 usePointerDrag() 的參數（例如傳入夾限規則）——放棄，因為 5 個 handler 的數學彼此不同（距離縮放、單軸縮放、多角夾限、位置百分比），硬塞成參數只會讓 usePointerDrag() 的介面爆炸，可讀性反而變差。

### 決策 2：usePercentDrag() 接受外部注入的 usePointerDrag 實例，預設才自己建立一個

`usePercentDrag(pointerDrag = usePointerDrag())` 回傳 `{ start(options), stop }`，其中 `stop` 就是傳入（或內建）的 `pointerDrag.stop`。`options` 包含：
- `containerBounds: DOMRect`（artboard 邊界）
- `elementBounds: DOMRect`（被拖曳元素邊界，用來算半寬高）
- `startEvent: PointerEvent`（拖曳起始事件，取 clientX/clientY 當起點）
- `startX: number`、`startY: number`（拖曳起始時的百分比座標）
- `onDrag(x: number, y: number)`（每次 pointermove 時呼叫，已完成夾限換算）

內部數學與現有 startTextDrag／startObjectDrag 完全相同：
```
halfWidth = min(50, elementBounds.width / containerBounds.width * 50)
halfHeight = min(50, elementBounds.height / containerBounds.height * 50)
nextX = startX + (moveEvent.clientX - startEvent.clientX) / containerBounds.width * 100
nextY = startY + (moveEvent.clientY - startEvent.clientY) / containerBounds.height * 100
onDrag(clamp(nextX, halfWidth, 100 - halfWidth), clamp(nextY, halfHeight, 100 - halfHeight))
```

**為什麼要能注入外部 pointerDrag 實例**：見決策 3——物件圖層的拖曳與縮放必須共用同一個 cleanup 槽位，如果 usePercentDrag() 永遠自己建立一個新的 usePointerDrag()，物件拖曳跟物件縮放就會變成兩個獨立槽位，跟現況的互斥語意不一致。

### 決策 3：物件圖層拖曳與縮放共用同一個 usePointerDrag 實例，比照現有 objectInteractionCleanup 的互斥語意

在 setup 層級建立：
```
const objectPointerDrag = usePointerDrag()
const objectDrag = usePercentDrag(objectPointerDrag)
```
startObjectDrag 呼叫 `objectDrag.start({ ...})`；startObjectResize 呼叫 `objectPointerDrag.start(onMove)`（縮放數學維持原樣，只是換了事件綁定的來源）。兩者共用 objectPointerDrag，因此其中一個開始時會自動清掉另一個尚未結束的監聽——跟現有程式碼 objectInteractionCleanup 被兩個 handler 共用的行為完全一致。

text 拖曳（textDragCleanup）、text 縮放（textResizeCleanup）、crop 縮放（resizeCleanup）在現有程式碼裡都是各自獨立的 cleanup 變數，互不共用，因此各自建立獨立的 composable 實例：
```
const textDrag = usePercentDrag()          // 內部自建一個 usePointerDrag，對應 textDragCleanup
const textResizeDrag = usePointerDrag()    // 對應 textResizeCleanup
const cropResizeDrag = usePointerDrag()    // 對應 resizeCleanup
```

## Implementation Contract

**行為**：重構前後，使用者在編輯器裡拖曳文字圖層、拖曳素材圖層、縮放素材圖層、縮放文字、拖曳裁切框四個角這五種互動，操作手感（夾限範圍、縮放比例上下限、拖曳靈敏度）SHALL 與重構前逐位元組相同。物件圖層的拖曳與縮放 SHALL 保持互斥（其中一個開始會清掉另一個尚未結束的監聽），文字拖曳、文字縮放、裁切縮放三者之間 SHALL 保持各自獨立（不互相清掉彼此）。

**介面 / 資料形狀**：
- `usePointerDrag(): { start(onMove: (event: PointerEvent) => void, onEnd?: () => void): void; stop(): void }`，定義於 src/composables/usePointerDrag.ts。
- `usePercentDrag(pointerDrag?: ReturnType<typeof usePointerDrag>): { start(options: { containerBounds: DOMRect; elementBounds: DOMRect; startEvent: PointerEvent; startX: number; startY: number; onDrag: (x: number, y: number) => void; onEnd?: () => void }): void; stop(): void }`，定義於 src/composables/usePercentDrag.ts，內部 import usePointerDrag。`onEnd` 是實作時補上的欄位（原始決策 2 的介面漏列）：startTextDrag／startObjectDrag 在拖曳結束時需要把 textDragging／layer.dragging 重設為 false，這個副作用只能透過把 onEnd 一路傳進底層 usePointerDrag(onMove, onEnd) 才能觸發。
- ImageEditorWorkspace.vue 的 5 個 handler 改為呼叫上述兩個 composable 的 start/stop，不再有任何模組層級的 cleanup 變數（textDragCleanup、objectInteractionCleanup、textResizeCleanup、resizeCleanup 全部移除，改由 composable 實例的 `.stop()` 取代）。
- onBeforeUnmount 裡原本呼叫 4 個 cleanup 變數的地方，改成呼叫 4 個 composable 實例（textDrag、objectPointerDrag、textResizeDrag、cropResizeDrag）各自的 `.stop()`。

**失敗模式**：這是同步、無外部 I/O 的事件綁定邏輯，沒有非同步失敗模式；`stop()` 在沒有進行中拖曳時呼叫是安全的 no-op（內部清理參照為 undefined 時直接跳過）。

**驗收標準**：
- `npm run build`（`vue-tsc --noEmit` + `vite build`）通過。
- `npm run lint` 通過。
- 手動在編輯器裡驗證五種互動（文字拖曳、物件拖曳、物件縮放、文字縮放、裁切縮放）的夾限範圍與縮放上下限與重構前一致。
- 手動驗證物件圖層「先按住拖曳、不放開、再按住同一物件的縮放把手」時，拖曳監聽會被清掉、只有縮放在生效（互斥行為保留）。
- `grep -n "Cleanup" src/components/ImageEditorWorkspace.vue` 確認 textDragCleanup、objectInteractionCleanup、textResizeCleanup、resizeCleanup 這 4 個變數名稱已從檔案中移除。

**範圍邊界**：僅涵蓋本次列出的 5 個 handler 與 2 個新 composable 檔案；不涉及 ImageEditorWorkspace.vue 其他部分（layers 拖放排序、字型選單、儲存流程、SCSS style）。

## Risks / Trade-offs

- [風險] usePercentDrag() 允許外部注入 pointerDrag 實例是為了保留 objectInteractionCleanup 的共用語意，但這個「有時共用、有時不共用」的彈性介面對後續維護者來說不夠直覺，容易誤用（例如誤以為每次呼叫 usePercentDrag() 都應該傳入現成實例） → [緩解] design.md（本文件）與 usePercentDrag() 的程式碼註解都要說明「預設自建一個獨立實例；只有需要跟其他互動共用同一個清理槽位時才注入」。
- [風險] 手動驗證五種拖曳/縮放互動屬於人工測試，沒有自動化測試防止未來回歸 → [緩解] 這是本次 Non-Goals 明確排除的範圍（不新增測試框架）；驗收標準改用逐行比對現有數學公式取代，降低人工測試遺漏的風險。
