## Context

`src/components/ImageEditorWorkspace.vue` 的可編輯文件是 `layers`（`reactive` 陣列，順序＝z 順序；圖層欄位全是原始型別）、`cropRect`（`reactive`）與 `ratio`（`ref`）。會改動它們的路徑有十幾條：新增文字／物件、「+」複製、顯示勾選、原圖鎖定、圖層拖放與鍵盤排序、字型、contenteditable 文字、屬性面板 input、顏色、裁切比例與重設、「復原裁切」「重新裁切」、換底圖、物件與文字的拖曳和縮放把手、裁切框拖曳。其中三個縮放拖曳（物件、文字、裁切框）沒有 onEnd。元件內原本沒有任何 ⌘／Ctrl 快捷鍵與刪除圖層功能。

編輯↔AI 修圖是同一個元件實例（只換 `mode` prop），切回素材庫會卸載元件。對話框（`useAccessibleDialog`）開著時 `#app` 被設為 `inert`。

## Goals / Non-Goals

**Goals:**

- 使用者能用按鈕與 ⌘／Ctrl 快捷鍵上一步／下一步、複製剪下貼上刪除圖層，每一步都是「使用者感覺的一個動作」，並從畫面上知道有這些快捷鍵。

**Non-Goals:**

- 系統剪貼簿、多選、Esc 取消選取、歷史跨分頁保存、AI 修圖頁的歷史（見 proposal）。

## Decisions

### 工具列 ‹ › 改為上一步／下一步，縮放改「− 80% +」

Figma `566:4973` canvas_topbar 的 `ic_back`／`ic_next` 就是上一步／下一步，封存的 `sync-mv-09-design` 也寫「上一步／下一步、縮放（%）」兩件事；`3456671` 把它們誤接成縮放。改回 `IconBack`／`IconNext` 並依 `canUndo`／`canRedo` 停用；縮放保留，改成文字鈕「−」「+」夾著百分比，中間以 1px 分隔線隔開。`.canvasActions__zoom` 改名 `.canvasActions__btn`。備案「另加彎箭頭圖示」要新畫兩顆 SVG 且兩組箭頭並排易誤按，不採。

### 歷史以文件 JSON 快照記錄，單一 watch 為唯一記錄點

快照＝`JSON.stringify({ layers, cropRect, ratio })`（剔除 `dragging`）。字串相等就是沒變、天生不可變；`structuredClone` 對 reactive Proxy 會拋 DataCloneError。每筆另附記錄當下的 `selectedLayerKey`（只用來還原選取，不參與比對）。

一個 `watch([docJson, pointerActive, editingTextKey])` 是唯一記錄點：指標按住中（`window` capture 的 `pointerdown`，只收主鍵）或 contenteditable 編輯中不記，放開／結束編輯時記下最終狀態 → 一次拖曳／縮放／裁切框拖曳＝一步、一次文字編輯＝一步，不必替三個沒有 onEnd 的縮放補 onEnd。`record` 遇到與目前這筆相同的字串直接 no-op，所以單純點選、點了沒拖、還原後 watch 回彈都不多記、不清下一步。新操作清掉下一步；超過 50 步丟最舊的一筆。拖曳 closure 直接寫圖層物件本身、還原會替換物件，所以指標按住中與文字編輯中不執行上一步／下一步。

編輯文字時按到畫布上別的東西，對方的 pointerdown 會 `preventDefault`、焦點不會離開文字框（實測），文字會停在編輯狀態、之後的拖曳被併進文字那一步 → 同一個 capture `pointerdown` 先 `finishTextEdit` 並立刻記一步。

### 連續輸入以合併 key 在 1 秒內合併

屬性面板文字 input 每鍵改內容、色盤拖動連發 input、方向鍵自動重複每秒約 30 次，不合併的話兩秒就吃光 50 步。合併 key（`text:`／`color:`／`nudge:`／`scale:` 加圖層 key）1 秒內同 key 合併、每次合併刷新時間；只有「上一個動作是記錄」才准合併（上一步／下一步之後一律另起一步）。合併後若回到上一步的文件（例：打字後在輸入框內原生撤銷）就拿掉這一步，免得多一次按了沒反應的上一步。

合併 key 必須在 v-model 寫值之前設好：Vue 先掛 v-model 的 input listener 才掛 `@input`，使用者事件在兩個 listener 之間會跑 microtask、watch 先記完，所以模板用 `@input.capture`。key 只活在設定它的那一個事件裡（document capture 的 `keydown` 與 `pointerdown` 一開始就清空）。

### 換底圖清空歷史，另存不清歷史

換底圖時同時清掉扣款紀錄（`usedTools`）；若能上一步回舊底圖，再點背景移除會對同一張圖重扣，所以換底圖以換圖後狀態為新基準（`reset`）。換底圖不會清掉文字／物件圖層，只是不能再回到換圖之前。另存不改文件、不算一步也不清歷史；上一步後既有的 fingerprint watch 會清掉「已存入」，另存按鈕自然恢復可按。扣款相關狀態（`usedTools`、`pricing`、`applyingTool`）不在快照內，永遠不會被上一步回滾。

### 圖層剪貼簿為元件內部變數

圖層是畫布內物件，別的 App 貼不出東西；讀系統剪貼簿要權限提示、外部圖片還要先上傳成素材，是另一個功能。⌘V 相對剪貼簿內容錯開 3%（連續貼上逐次再錯開），剪下後的第一次貼上回原位（剪下＝移動）。⌘D 等同圖層面板「+」（原地、不錯開）；「+」、⌘D、⌘V 共用 `insertLayerCopy`。原圖一律不可複製／剪下／刪除／微調（沿用 `canDuplicateSelectedLayer`）。

### 快捷鍵守衛交給原生的情境

處理器掛 `document` 的 `keydown`（bubble，才看得到元素層級處理器的 `defaultPrevented`），依序在以下情況直接 return：AI 修圖頁、還沒選底圖、元素層級處理器已處理（縮放把手方向鍵、圖層排序、文字 Enter／F2）、注音選字中、`#app` 為 `inert`（任何對話框）、焦點在文字輸入（`isContentEditable`、`textarea`、`select`、文字類 `input`；勾選框、色盤等非文字 `input` 不算）、指標按住中或文字編輯中（此時 ⌘Z／⌘Y 仍 `preventDefault`，否則 macOS Chrome 會執行原生 undo、撤銷先前在 input 打的字）、⌘／Ctrl 搭配 Alt（Windows AltGr）、非 ⌘ 鍵且字型選單或快捷鍵一覽開著（看狀態不看焦點：Safari 點按鈕不給焦點）。⌘⇧C、⌘⇧D 讓給瀏覽器。⌘C 只在「畫布以外」有反白文字時讓給原生複製：開始編輯文字時的全選在結束編輯後仍殘留在畫布內。畫布文字編輯改 `contenteditable="plaintext-only"`，原生 ⌘V 貼富文字時只留純文字，畫面與另存（只取 `textContent`）一致。

### 提示採常駐入口，不做一次性提示

工具列與圖層面板按鈕的 `title`／`aria-label` 含快捷鍵（Mac 用 ⌘、其他用 Ctrl；兩種修飾鍵都收）；畫布底部常駐「鍵盤快捷鍵」disclosure 按鈕（`aria-expanded`＋`aria-controls`）開一覽浮層，點外面／Esc 關（沿用 `useDismissableMenu`，非 modal，不用 `useAccessibleDialog` 以免 `#app` 被設 inert）；⌘C／⌘X 後常駐的 `output` 換上 2 秒「圖層已放入剪貼簿，按 ⌘V 貼上」。一次性提示看過就沒了，還要 localStorage 與關閉邏輯，不做。

### 復原後的選取與工具

上一步／下一步後的選取：重新出現的圖層優先（對齊 Figma：復原刪除會把刪掉的圖層選回來）→ 目前選取仍在就保留 → 該步紀錄的選取 → 原圖 → 空。上一步／下一步不改工具，唯一例外：還原的是裁切框或比例、而目前不在裁切工具時自動切到裁切工具——裁切框只在裁切工具下看得到，否則按 ⌘Z 畫面毫無變化。

## Risks / Trade-offs

- [Risk] 指標在瀏覽器視窗外放開、系統沒送 `pointerup` 時閘門會卡住，直到下一次點擊 → [Mitigation] 下一次 `pointerup` 會把那次拖曳記成一步，不會遺失。
- [Risk] 編輯文字時點畫布上其他物件會結束編輯，是使用者看得到的行為改變 → [Mitigation] 屬修正：原本停在編輯狀態時 Delete／⌘Z 會打到那個文字框。
- [Risk] 自動切到裁切工具會讓之後另存套用裁切（`buildOutputFile` 只在裁切工具下套裁切）→ 與使用者自己切到裁切工具的行為一致，視為正確。
- [Risk] `contenteditable="plaintext-only"` 在 Firefox 136（2025-03）才支援，更舊的 Firefox 會把無效值當成繼承、畫布文字無法雙擊編輯 → 可接受：Chrome／Safari／Edge 早已支援，屬性面板的文字 input 仍可改內容。
- [Risk] AI 物件 mock 的 700ms 計時若剛好落在拖曳中，新圖層會被併進那次拖曳的步驟 → 罕見，不處理。
