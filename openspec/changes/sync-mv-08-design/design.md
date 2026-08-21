## Context

`BrandSettingsView.vue` 依設計稿拆成四個頁籤：MV-08 `18:2`、MV-08b `238:1710`、MV-08c `238:1901`、MV-08d `238:2092`。

## Goals / Non-Goals

**Goals:**

- 分段導覽 + 新增「合規與授權」區塊，對齊設計稿。

**Non-Goals:**

- 不改動既有的品牌儲存資料流（`brandStore` / `getBrand` / `saveBrand`），僅視需要擴充欄位。

## Decisions

- **使用頁籤切換四組設定。** 對齊 Figma 的底線式 tab bar，避免單頁表單超出首屏。
- **頁籤與操作按鈕沿用共用元件。** 頁籤使用 `AppTab`，取消／儲存使用 `AppButton`，下拉箭頭使用 `IconChevronDown`，避免設定頁另建重複樣式。
- **「合規與授權」欄位以設計稿 MV-08d 為準定義。** 目前 `BrandProfile` 沒有合規相關欄位，需要時再擴充型別與 mock，避免先建無用結構。
- **授權文案字數維持動態計算。** Figma 範例顯示 42 / 200，但現行預設文案實際為 25 / 200；前端不得硬寫範例數字。
- **手機頁籤維持單行橫向捲動。** 320px 與 375px 不壓縮或折行頁籤，避免標籤文字被裁切。
- **不保留舊的單一模組提示。** 品牌設定頁採 Figma 文案；圖生影 MV-04 仍依已確認需求不顯示「品牌設定」。

## 2026-08-21 全頁比對：四項落差

以 Figma section ⑨（`615:5318`）的四個分頁逐節點對照 `BrandSettingsView.vue` 後，發現下列落差。此前 tasks 已標記 10/10 完成，但比對並不完整。

### 產業別下拉：原生 select 做不到設計稿的結構

實作為原生 `<select>`，選項寫死四個（`服飾 · 生活選物` / `美妝保養` / `食品餐飲` / `其他`）。設計稿 `dropdown_產業別`（node `1139:716`，420x325）是自訂面板：

```
dropdown_產業別    420 x 325
├── row_search     420 x 54    搜尋框 392x32
├── list_industry  420 x 236   可捲動，5 個分組共 22 個選項，選項列高 30、左內距 10
│     scroll_fade  420 x 22    底部漸層遮罩
└── dd_foot        420 x 35    「找不到適合的？選「其他」」
```

選中項右側有 `ic_ok` 打勾（15x15）。22 個選項分組如下：

| 分組       | 選項                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- |
| 零售與電商 | 服飾·配件、美妝·保養、生活選物·家居、3C·家電、珠寶·鐘錶、母嬰·童裝、運動·戶外、寵物用品 |
| 餐飲與食品 | 餐廳·咖啡、食品·伴手禮、飲料·手搖                                                       |
| 醫療與健康 | 醫美·診所、藥局·保健食品、健身·運動中心                                                 |
| 服務業     | 旅遊·住宿、教育·課程、美容·美髮·SPA、專業服務（金融／法律／顧問）、房地產·裝修          |
| 其他       | 製造·B2B、非營利·公部門、其他                                                           |

**與 MV-09 字型選單同一類問題**：原生 `<option>` 由作業系統繪製，塞不進搜尋框、分組標頭、選中打勾與底部提示。解法沿用 `ImageEditorWorkspace.vue` 已完成的自訂 listbox（`role="listbox"` / `role="option"`、點擊外部與 Esc 關閉、漸層遮罩放在捲動容器之外）。

### 品牌 Logo 區缺三個動作與成功標示

設計稿 `upload_logo`（1054x83）的 `detect_col` 含三列：檔名 + `ok`（`ic_ok` 14x14 + 「已自動偵測主色」）、自動萃取提示、以及 `r2` 的「重新偵測」「更換 Logo」「移除」三個文字動作。實作只有圖示 + 檔名 + 用途說明，缺 `r2` 與成功標示；目前僅有 `analyzing`（辨識中）與 `paletteError`（失敗）兩種狀態，成功時沒有正面回饋。

### 品牌色票缺占比、註記與「全部套用」

設計稿 `row_sw_head` 右側有「全部套用」；`row_extracted` 的五個萃取色各自帶像素占比（62% / 18% / 11% / 6% / 3%），前兩色另有用途 `note`。實作的 `detectedPalette` 只顯示色塊與色碼。

占比需要 `src/utils/colors.ts` 的 `extractColors` 回傳像素比例；若目前只回傳色碼，`BrandProfile` 與 mock 很可能需要新欄位 —— 這會回頭影響任務 3.2 的判斷（見 tasks 第 5 節）。

指派主色／輔色／點綴色的互動，設計稿是 `tip` 文字說明，實作用按鈕達成；功能等價，**維持實作現況不改**。

### textarea 寬度：原判定有誤，實作早已相符（2026-08-21 更正）

初次比對時記為「實作是 `width: 100%`，與設計稿的 200px 不符」，**此判定錯誤**。實際查核 `BrandSettingsView.vue` 的樣式：

```scss
.field textarea {
  width: 12.5rem;
  max-width: 100%;
} // 12.5rem = 200px
.card--copy textarea {
  height: 5rem;
} // 80px
.card--compliance textarea {
  height: 5.5rem;
} // 88px
```

兩個 textarea 已經是 200x80 與 200x88，與設計稿完全一致；`@media (max-width: $bp-md)` 下才改為 `width: 100%`，屬於手機版的合理處理。**不需要任何改動，也不需要向設計師確認。** 此段保留錯誤紀錄，避免日後有人再依錯誤結論去「修正」成滿版。

## 2026-08-21 產業別下拉：實作決策

依 `dropdown_產業別`（node `1139:716`）實作為自訂 listbox 後的取捨，逐項記錄：

- **面板寬度取設計稿的 420px（`26.25rem`）並加 `max-width: 100%`。** 設計稿的下拉是獨立元件、寬 420，而欄位本身在 1102 寬的卡片裡是滿版；不把面板拉成滿版，因為 22 個短選項在 1054 寬的面板裡會非常空。`max-width: 100%` 讓手機版自動收斂。
- **`BrandProfile.industry` 改存英文 id（`apparel` / `beauty` …），不存翻譯後的中文標籤。** 舊值是中文字面量，切換語系時資料語意會漂移；改 id 後同時符合 `ui-localization` 的 Requirement「Translated labels do not control behavior」。`mock.ts` 的預設值一併由 `'服飾 · 生活選物'` 改為 `'apparel'`。`selectedIndustryLabel` 對找不到對應 id 的舊值直接顯示原字串，不會吐出 i18n key。
- **`BrandProfile` 型別不需擴充。** `industry: string` 原本就容得下 id，這次沒有新增欄位。
- **搜尋框沿用共用元件 `AppSearchbar`。** 其既有樣式（高 32、圓角 18、border `$gray`、placeholder `$gray-100`、字級 14）與設計稿 `field_搜尋產業` 完全相同，只需覆寫寬度為 100%。
- **順手修好 `AppSearchbar` 的放大鏡圖示。** 該元件自建立起（`49a8a17`）template 就漏了 `IconSearch` 這一行，但 `import` 與 `.appSearchbar__icon`（`left: 0.75rem`）樣式都在、`input` 也保留了 `padding-left: 2.5rem` 的空位——等於一直空著一塊。補回後正好對上設計稿的「圖示 20 + gap 8 + 左內距 12 = 文字起點 40px」。此修正同時影響 `LibraryView.vue` 與 `ImagePickerDialog.vue` 的搜尋框。
- **搜尋無結果時的提示是實作新增的。** 設計稿沒有畫空狀態，但 236px 的清單區全空會像壞掉，因此比照 `library.empty`（「沒有符合的素材」）新增 `brandSettings.industryEmpty`（「沒有符合的產業別」）。底部 `dd_foot` 的「找不到適合的？選「其他」」維持設計稿原文不動。
- **收合狀態的觸發鈕外觀維持原樣**（高 2.75rem、圓角 8、底色 `$blue-light`、文字 `$dark-blue-gray`）。那是任務 2.1 已對齊過的欄位樣式，本次只換開啟後的面板，不順手改已驗收的部分。
- **`.card--basic` 與 `.field--industry` 的 `overflow` 由 `hidden` 改為 `visible`。** 否則 325px 高的面板會被卡片裁掉。面板 `z-index: 20`，頁面其餘元素都沒有設 z-index，不會被蓋住。
- **hover 底色 `#f7f8fc` 是實作補的**，設計稿沒有畫 hover 狀態；與字型選單一致。
- **打勾沿用 `IconCheckCircle`**，設計稿的 `ic_ok` 在此處是 15x15，字型選單是 14x14，同一圖形不同匯出尺寸，SVG 縮放後等價。
- **`scroll_fade` 放在捲動容器之外。** 與字型選單同一個理由：`position: absolute` 放在 `overflow: auto` 容器內會跟著內容捲走。

## 2026-08-21 品牌視覺識別：實作決策

### Logo 區

- **容器由 `<label>` 改為 `<div>`。** 原本整塊是 `label[for=brand-logo-upload]`，點哪裡都會開檔案選擇器；加入「重新偵測／更換 Logo／移除」後，這三個動作會被 label 一併觸發。改成：還沒上傳時用 `label.logoUpload__drop` 包住圖示與說明維持整塊可點，已上傳後由「更換 Logo」按鈕呼叫 `logoInput.click()`。三個動作都是 `<button>` 而非 `<label>`，鍵盤可聚焦。
- **「重新偵測」不需要重新選檔。** `profile.logoUrl` 存的是 data URL，`fetch(logoUrl).blob()` 就能還原成可取樣的來源，因此 `extractColors` 的參數由 `File` 放寬為 `Blob`（`createImageBitmap` 與 `URL.createObjectURL` 都吃 `Blob`）。
- **偵測成功標示的顯示條件是「有萃取結果且不在辨識中、也沒有錯誤」。** 原本只有 `analyzing`（辨識中）與 `paletteError`（失敗）兩態，成功時沒有任何正面回饋；現在補成三態。
- **`onLogo` 結束時清空 `input.value`。** 否則使用者「更換 Logo」選到同一個檔案不會觸發 `change`。
- **舊的 `.logo` / `.logo__copy` 樣式整組移除**，`.field > label:not(.logo)` 也因此簡化為 `.field > label`。

### 色票區

- **`extractColors` 回傳型別由 `string[]` 改為 `DominantColor[]`（`{ hex, share }`）。** 只有 `BrandSettingsView.vue` 用到它，改動面很小。`dominantColors` 保留原簽章（內部委派給新的 `dominantColorShares`），既有 5 個單元測試一行都不用改。
- **相近色併入代表色，而不是丟掉。** 原本 `dist <= 48` 的桶會被直接略過，占比因此被拆散而失真；改成把像素數加進已選中的代表色。這同時讓「占比」這個數字有意義——沒被任何代表色吸收的只有低於 `minCount`（總數 0.5%）的雜點。
- **占比的分母是「不透明且非近白」的像素數，各色不保證加總為 100%。** 設計稿範例剛好是 62/18/11/6/3 = 100，那是 mock 數字；實作不硬寫，依 CLAUDE.md「前端不得硬寫範例數字」。
- **`已設為主色` 是即時推導，不是新欄位。** 逐一比對萃取色與 `profile.colors[i].hex`，命中就顯示對應角色名。**因此 `BrandProfile` 不需要新增欄位，任務 3.2 當初的判斷成立**——「全部套用」也只是寫回既有的 `colors` 陣列。
- **「全部套用」把前三個萃取色依序寫入主色／輔色／點綴色。** 上限取 `colorLabels.length`，色票不足時補齊再寫入。
- **保留「先選色塊、再選角色」的兩段式指派。** 設計稿只用 `tip` 文字說「點色塊即可指派為主色／輔色／點綴色」，沒有畫出點下去要指派到哪一個角色的機制；兩段式沒有這個歧義，因此維持既有互動，並額外為選中的色塊加一圈 `box-shadow`（設計稿沒有這個狀態）。
- **排序沿用既有的評分，未改為純占比排序。** 設計稿 `tip` 第二行寫「偵測結果依 Logo 像素占比排序」，但實作的評分是 `sqrt(面積) x 飽和度權重 x 明度權重`，且既有測試「飽和度加權：小面積的鮮豔色勝過大面積的淡色背景」明確鎖住這個行為。面積是主項，措辭大致成立，但不完全等價——列為任務 5.13 待設計師確認，不由前端單方面改測試或改文案。
- **`palette.hint`（「先選擇候選色，再指定為主色、輔色或點綴色。」）移除**，由設計稿的 `tip` 兩行取代；`palette.title` 由「從 Logo 偵測到的顏色」改為設計稿的「從 Logo 萃取的顏色」。
