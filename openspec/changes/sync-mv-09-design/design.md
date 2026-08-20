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

## Risks / Trade-offs

- **anchor 覆蓋率低，drift 偵測形同盲區。** sync-mv-09-design 目前僅 6 個 anchor 涵蓋整個 `ImageEditorWorkspace.vue`，本次字型選單大改（3 個 commit）完全沒被 `spectra drift` 抓到。 → Mitigation：為 `ImageEditorWorkspace.vue` 的字型選單、圖層面板、AI 修圖、裁切四塊各補一個 anchor（見 tasks 4.3）。
