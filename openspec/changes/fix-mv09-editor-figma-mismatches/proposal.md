# Proposal：MV09 圖片編輯器對齊 Figma（615:5312）

## 為什麼

使用者要求依 Figma section `615:5312`（③ 圖片編輯與 AI 修圖）逐一核對 `ImageEditorWorkspace.vue` 的 11 個子畫面。核對後確認 6 個畫面（工具列、圖層面板、字型選單、比對面板結構、CTA 按鈕載入態等）與設計稿一致，但有 5 處落差：

1. **加入物件（MV-09d，`1141:906`）**：設計稿是在畫布框選範圍後，用文字描述＋常用物件預設（花束／綠植／杯盤／陰影／裝飾字卡）生成新圖層；實作原本是打開素材庫挑一張既有素材直接疊圖，互動模型完全不同。
2. **指令修圖（MV-09b2，`1140:714`）**：設計稿的「指令修圖」只有常用指令快速鍵＋文字輸入框，計費是單一一口價；實作把「快速修飾」的分項勾選清單（含各項飼料成本）也套用在指令修圖底下，兩種計價方式同時出現造成矛盾。
3. **裁切套用後（MV-09e，`1144:570`）**：設計稿選定固定比例後會顯示套用結果徽章＋「復原裁切／重新裁切／另存為新素材」，實作只有拖曳調整用的框選把手，沒有這個「已套用」的確認狀態。
4. **背景移除中（MV-09i，`1311:834`）**：設計稿在背景移除執行期間，畫布會顯示處理中覆蓋層（spinner＋說明文字＋取消鈕）；實作只有工具列按鈕本身變成 disabled，沒有任何畫面回饋。
5. **AI 修圖修圖中（MV-09b3，`1311:580`）**：設計稿「修圖後」對比欄位在處理期間顯示 loading 狀態（spinner＋目前處理到第幾項＋進度條）；實作只有送出按鈕上的 spinner，比對面板本身沒有任何處理中回饋。

## 做了什麼

- `src/components/ImageEditorWorkspace.vue`
  - 加入物件：新增可拖曳移動的畫布框選（`objectSelection`），右側面板新增「加入物件」表單（物件描述文字框＋常用預設快速鍵＋「生成物件」按鈕），移除原本開啟素材庫 picker 疊圖的路徑（`openObjectPicker`／`editorPickerPurpose==='object'`）
  - 指令修圖：移除套用在指令修圖底下的分項勾選清單，改為常用指令快速鍵（點選帶入文字，可續打）＋維持一口價 `commandRetouchBaseCost`；`retouchOptionsForMethod` 在指令模式下固定回傳空陣列
  - 裁切：選定固定比例（`ratio !== 'custom'`）時顯示套用結果徽章與「復原裁切／重新裁切／另存為新素材」；點選「自訂」或「重新裁切」才回到拖曳把手狀態
  - 背景移除：新增畫布處理中覆蓋層（`applyingTool === 'remove'`），含取消鈕；mock 扣款發生在 `api.applyEditTool` 內部無法真的中止，取消鈕只先收合等待畫面（程式碼有註解說明）
  - AI 修圖：比對面板「修圖後」欄位在 `retouching` 為真時顯示處理中狀態，依實際選取的項目模擬逐步進度（步驟 X/N），~~不虛構無法保證準確的秒數倒數~~（此決策已在下方「後續調整」反轉）
- `src/lang/zh-Hant.ts`：新增上述功能對應的文案（`editor.addObject.*`、`editor.retouch.commandPresets.*`／`presetsHint`／`inProgress`／`stepLabel`、`editor.tools.removeInProgress*`、`editor.cropApplied.*`、`editor.channelPreviewsApplied`）
- `openspec/specs/image-editor-ui/spec.md`：更新「AI 工具即時扣款並顯示成本」「AI 修圖提供分項修飾與對比」「裁切提供各通路預覽且不扣飼料」三個既有 Requirement 的內容與 trace，並新增「加入物件為文字描述生成，非從圖庫疊圖」這個新 Requirement

## 後續調整（ingest，2026-09-07）

AI 修圖 loading box（MV-09b3，Figma node `1311:580`／`1311:814`／`1311:815`／`1311:820`）在使用者提供 Figma 原始匯出資料與截圖比對後，做了三處進一步修正（commit `408f2cf`、`a376fc1`、`3825fcc`、`c086f5e`，作者 許志豪，與 Claude Sonnet 5 協作）：

1. **補上「約剩 X 秒」倒數文字**（`408f2cf`）：原本的決策是「mock 沒有真實生成耗時，怕顯示不準確秒數誤導使用者」而刻意不做；現在反轉這個決策，改用估計值先把畫面感覺做出來——每步驟抓 9 秒（`RETOUCH_SECONDS_PER_STEP`），對齊 Figma 範例「步驟 2/3・約剩 18 秒」。新增 `retouchSecondsRemaining` ref 與每秒遞減的計時器（跟既有的步驟計時器 `stepTimer` 同生命週期）；程式碼裡明確留了 TODO——等後端 `/edit` 真的接上、有實際生成耗時後，要換成後端回傳（或至少量測過）的秒數，不能一直用這個猜的常數。同時補上 `en.ts` 缺漏的 `editor.retouch.inProgress`／`stepLabel`／`timeRemaining` 三個 key（避免英文介面中英夾雜）。
2. **spinner 圖示改用 Figma 原始路徑**（`a376fc1` → `3825fcc` 修正）：loading box 的 spinner（`1311:815`）原本借用 `IconAiSparkle`（星芒圖示，形狀跟設計稿不同），新增 `IconSpinnerRing.vue`；第一版是連不上 figma.com（代理擋下、403）時只能照截圖目測比例手刻（四分之三圈、圓頭端點），顏色對但弧長猜錯；使用者後續直接貼出 node `1311:815` 的原始匯出 SVG 路徑，改成兩個 path 原封不動套用（軌道環的挖孔路徑＋弧形實心色塊，實際弧長約 153°、平切角非圓頭），只把固定的 `width/height="38"` 換成 `1em` 以配合專案既有 icon 縮放慣例。`IconAiSparkle` 在同一個檔案的「AI 去背」按鈕仍在用，不受影響。
3. **進度條改成從空到滿依時間軸真的漸進**（`c086f5e`）：原本 `retouchProgressPercent` 是拿「選了幾個項目」換算 `retouchStepIndex` 當進度，只選 2 個項目時開場就直接跳到 50%，體感像「已經做了一半」而非「才剛開始」。改成新增 `retouchTotalSeconds`（＝步驟數 × 9 秒的估計總時長），進度 ＝ 已過秒數 ÷ 估計總秒數，從 0% 起算、每秒跟著 `retouchSecondsRemaining` 遞減同步往上爬，兩個數字（進度條與秒數文字）共用同一份時間軸，不再各自為政；`stepLabel`（步驟 X/Y：名稱）維持原邏輯，只是不再拿步驟索引換算百分比。順手把進度條軌道背景色修正為 Figma 實際值 `#EFF2FA`（原本借用的 `#D2D5DD`）。

## 影響範圍

僅影響圖片編輯器（`ImageEditorWorkspace.vue`）畫面本身：加入物件、指令修圖、裁切、背景移除、AI 修圖等子功能的畫面與互動；不涉及後端 API 契約（加入物件本身不扣飼料，維持原本 costNote 的說明），不影響其他畫面共用元件。「後續調整」新增了 `src/components/icons/IconSpinnerRing.vue`（新檔案）與 `src/components/icons/index.ts`（新增匯出）。

## 後續調整二（ingest，2026-09-08）：背景移除覆蓋層對齊 Figma

任務 1.5 當初做的背景移除覆蓋層是依現有程式碼結構推斷刻出來的，借用了修圖 loading box 的 `IconAiSparkle` 圖示與隨手選的間距／顏色，沒有真的比對過覆蓋層自己的 Figma node。commit `cf7269b` 補上這次比對（node `1311:1042`，overlay_processing）：

- spinner 換成 `IconSpinnerRing`（跟修圖 loading box／`1311:815` 同一顆環形＋弧形圖示），取代形狀不符的 `IconAiSparkle`，尺寸 32px → 40px（節點標註值）
- 取消按鈕從 `size="compact"` 改回 `AppButton` 預設 medium 尺寸（對齊節點 `1311:1048` 量出來的 36px 高／18px 圓角／9px·16px padding）
- 疊層背景 `rgba(255,255,255,0.92)` → `0.96`、元素間距 `6px` → `12px`、副標文字色 `#9299aa` → `#606692`，皆為量測 Figma 後的訂正；補上 `border-radius: 4px` 避免疊層方角蓋住外層 `.artboard` 既有的圓角邊框

## 待確認

- 裁切「已套用」狀態的觸發條件（固定比例 vs 自訂拖曳）是依現有程式碼與設計稿結構推斷的合理對應，Figma 本身沒有明確標示觸發時機，若跟設計師確認後有出入可再調整。
- 背景移除「取消」按鈕目前只是先收合等待畫面，不是真的中止扣款（mock 架構限制），如果之後要做到真正可中止需要後端／mock 一起調整。
- 「約剩 X 秒」與進度條目前都是 `RETOUCH_SECONDS_PER_STEP = 9` 這個猜測常數換算出來的估計值，不是真實生成耗時；等後端 `/edit` 真的接上、有實際生成耗時（或至少量測過的數據）後需要換掉，程式碼裡已留 TODO 註解。
