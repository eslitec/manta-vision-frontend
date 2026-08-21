## Context

section ③（MV-09 `566:4717`／09b `608:5147`／09c `605:4963`）掛在圖庫的三個分頁下；`ImageEditorWorkspace.vue` 提供編輯畫布、AI 修圖與裁切預覽。

## Goals / Non-Goals

**Goals:**

- 在既有圖庫分頁架構下，補齊「編輯圖片」與「AI 修圖」的實際內容。
- 非破壞編輯：一律另存為新素材。

**Non-Goals:**

- 不接真實影像處理後端；AI 工具以 mock 模擬（沿用 `api.editImage` 的雛形擴充）。
- 首版不做複雜的多圖層合成，先支援設計稿呈現的文字圖層與基本 AI 修飾。

## Decisions

- **掛在既有圖庫分頁，而非新路由。** 設計稿的 tabs（素材庫／編輯圖片／AI 修圖）就在圖庫頁內，沿用現有 `activeTab`，把兩個空殼分頁補上內容，維持與素材庫共用的情境（選素材 → 編輯／修圖 → 存回圖庫）。
- **編輯與修圖一律「另存為新素材」（tag `edit`）。** 與現有 `api.editImage`（去背→編輯產物）一致，維持非破壞原則，來源鏈可回溯。
- **AI 工具即時扣款、裁切旋轉免費。** 對齊設計稿：AI 類工具（去雜物／修瑕疵／放大／背景移除）執行當下扣款，純幾何操作（裁切／旋轉）不扣費。
- **拆分建置順序：先編輯畫布（文字圖層）→ 再 AI 修圖 → 再裁切預覽。** 三者可獨立交付；優先做使用者最常用的文字編輯與 AI 修圖。
- **字型選單改為自訂 listbox，逐項對齊 Figma `list_font`（node `1157:872`）。** 原生 `<select>` 由作業系統繪製，無法呈現設計稿的分組標頭、副標與選中打勾樣式；改用 `role="listbox"` + `role="option"` 自訂元件，比照 `dropdown_font`（node `1157:871`、`566:5089`、`1157:623`）逐值校正面板尺寸、字重字色、選中列底色、捲動底部漸層遮罩與 default／active 框線。選項收斂為思源黑體、思源宋體兩個中文字體與 Inter／Roboto／Arial／Helvetica／Georgia／Times New Roman／Courier New 七個英數字體，移除 Chiron GoRound TC、霞鶩文楷 TC、jf open 粉圓、芫荽等設計稿未收錄字體；字重固定 Bold(700)，因設計稿屬性面板只有「文字內容／字型／字級／對齊」，沒有字重選擇器。

## 實作對照

`ImageEditorWorkspace.vue` 是單一大型元件，四個功能區塊的進入點如下。這一節同時作為 `spectra drift` 的 anchor 來源：任一符號被改名或移除時，drift 會回報 broken anchor，提醒規格需要跟著更新。

**字型選單**（`src/components/ImageEditorWorkspace.vue`）

- `fontOptions` — 九個字體家族的定義，與 Figma `list_font` 逐項對應
- `fontGroups` — 中文／英數兩組的分組結構
- `selectedFontId`／`selectedFont` — 目前選取的字體
- `fontMenuOpen`／`selectFont` — 自訂 listbox 的開闔與選取

**圖層面板**（同檔案）

- `layers` — 圖層清單（文字／物件／淡化／原圖）
- `selectedLayerKey`／`textLayer` — 目前選取的圖層與文字圖層狀態
- `layerZIndex` — 圖層堆疊順序
- `startLayerDrag`／`handleLayerOrderKeydown` — 拖曳與鍵盤調整順序

**AI 修圖**（同檔案）

- `retouchOptions` — 分項修飾（去雜物／修瑕疵／光線校正／放大）
- `retouchMethod`／`retouchSetupOpen` — 快速修飾與指令修飾的切換
- `retouchInstruction` — 選填的修圖指令
- `estimatedRetouchCost` — 即時合計的飼料消耗

**裁切預覽**（同檔案）

- `cropRect` — 裁切框位置與尺寸
- `zoomPercent` — 畫布縮放

**跨檔依賴**

- `src/components/SaveAssetDialog.vue` — 「另存為新素材」對話框
- `src/composables/useAssets.ts` — 存回圖庫
- `src/stores/feed.ts` — 飼料扣款
- `src/api/mock.ts` — 影像處理的 mock 端點
- `src/components/icons/IconCheckCircle.vue` — 字型選單選中列的打勾圖示

## Risks / Trade-offs

- **anchor 覆蓋率低，drift 偵測形同盲區。** sync-mv-09-design 目前僅 6 個 anchor 涵蓋整個 `ImageEditorWorkspace.vue`，本次字型選單大改（3 個 commit）完全沒被 `spectra drift` 抓到。 → Mitigation：為 `ImageEditorWorkspace.vue` 的字型選單、圖層面板、AI 修圖、裁切四塊各補一個 anchor（見 tasks 4.3）。

## 2026-08-21 串接扣款：把「另存」與「扣款」分開

原本 `api.editImage` 一支端點同時承擔「去背／修圖」與「另存為新素材」兩件事，而它其實沒有扣任何飼料——畫面上的 8 顆是寫死在 template 裡的。設計稿的成本說明寫得很清楚：**「目前只有背景移除會扣飼料，且在執行當下即扣；加入物件、文字、裁切、淡化皆不扣，另存也不再扣。」** 依這句話把端點拆開：

| 端點                    | 做什麼                                     | 扣款         |
| ----------------------- | ------------------------------------------ | ------------ |
| `getEditorPricing()`    | 回傳價目表（工具、修飾項目、指令式基本費） | 否           |
| `applyEditTool(tool)`   | 編輯畫布套用一次 AI 工具                   | 是，執行當下 |
| `retouchImage(req)`     | AI 修圖                                    | 是，生成當下 |
| `editImage(name, opts)` | 建立編輯產物（非破壞）                     | **否**       |

### 決策

- **金額一律由後端算，不採信前端傳來的成本。** `retouchImage` 只收 `method` 與 `options`，自己查價目表加總後扣款，回傳實際金額。前端畫面上的「預估消耗」就只是預估，最終以回傳值為準（`lastRetouchCost` 改吃 `result.cost`）。
- **價目表也由後端出。** 原本 `retouchOptions` 的成本是 `index === 2 ? 0 : index === 3 ? 5 : 8` 這種位置推算，工具列的 8 顆更是直接寫在 template。改為 `getEditorPricing()` 回傳後填入，符合 CLAUDE.md 的「前端不得硬寫範例數字」。
- **背景移除同一張素材只扣一次。** 點工具按鈕＝執行，但重複點不重複扣（`usedTools` 已有該工具就跳過）。換來源素材時清空 `usedTools`，因為扣款紀錄屬於前一張圖。
- **「本次編輯已使用的 AI 工具」面板改為資料驅動。** 原本寫死一列「背景移除 8 顆」＋合計 8 顆，等於不論使用者做了什麼都長一樣。改為依 `usedTools` 渲染，還沒用過任何 AI 工具時整塊不顯示——**設計稿沒有畫這個空狀態**，但顯示一個空的「已使用」清單更奇怪。
- **錯誤處理沿用既有慣例。** `isInsufficientFeed(e)` → `errors.insufficientFeed`，其餘 → `errors.generationFailed`，不新增文案。錯誤以 `role="alert"` 呈現在對應面板內。
- **指令式修圖的項目過濾前後端各做一次。** 前端只送該修圖方式開放的項目，後端 `retouchImage` 也會再濾一次——前端過濾是為了預估金額正確，後端過濾是因為不能信任前端。

### 已知落差

- **扣款目前只發生在 mock。** `api` 指向 `mockApi`，`deduct()` 改的是記憶體裡的 `db.feedBalance`；後端就緒後把這三支換成 http 呼叫即可，介面不變。
- **背景移除沒有真的去背。** 這一版只做扣款與狀態，畫布上的影像仍是佔位圖——與 `downloadEditedCopy` 的 MOCK 註記同一個層次的限制。
