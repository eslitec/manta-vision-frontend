## 1. 編輯畫布（MV-09）

- [x] 1.1「編輯圖片」分頁建立編輯畫布版面：左工具列、中央畫布、右側圖層＋屬性面板
- [x] 1.2 頂部工具列：素材名、「已編輯」標記、上一步／下一步、縮放（%）、「另存為新素材」
- [x] 1.3 文字圖層選取狀態與屬性面板（文字內容／字型／字級／對齊）
- [x] 1.4 對齊 Requirement「AI 工具即時扣款並顯示成本」：AI 工具成本提示（例：背景移除 8 顆）
- [x] 1.5 對齊 Requirement「非破壞編輯，另存為新素材」：另存為新素材提示，不覆寫原圖
- [x] 1.6 字型選單的九個字體家族與 Figma list_font 逐項一致：收斂為中文思源黑體 Noto Sans TC／思源宋體 Noto Serif TC 與英數 Inter／Roboto／Arial／Helvetica／Georgia／Times New Roman／Courier New 共九項分兩組，移除 Chiron GoRound TC 等設計稿未收錄字體；驗證：`ImageEditorWorkspace.vue` 的 `fontOptions`／`fontGroups` 與 Figma `list_font`（node `1157:872`）逐項比對、`npm run build` 通過（commit `05d93f5`）
- [x] 1.7 字型選單改為自訂 listbox（`role="listbox"`／`role="option"`），還原分組標頭、字體名副標、選中列打勾與捲動底部漸層遮罩，數值對齊 `dropdown_font`（node `1157:871`）；驗證：手動比對面板寬 288、列高 41、選中列底色 `#eff2fa` 與 Figma 一致（commit `8af74a7`、`bde016b`）
- [x] 1.8 字型選單 trigger 還原 default（`#d2d5dd`）與 active（`#2e3567`）兩種框線狀態，對齊 node `566:5089`／`1157:623`；驗證：手動切換選單開闔並比對框線色（commit `eb78827`）
- [x] 1.9 文字圖層字重固定 Bold(700)、色 `#2e3567`、字級 20px，屬性面板補上「字重 Bold ・」說明文字，與 node `566:4999`／`566:5084` 一致；驗證：`src/lang/zh-Hant.ts`／`en.ts` 的 `editor.textSettings`、`editor.fontDescriptions` key 結構一致、`npm run build` 通過

## 2. AI 修圖（MV-09b）

- [x] 2.1「AI 修圖」分頁：選素材 → 修圖方式 → 修飾項目
- [x] 2.2 修飾項目與個別成本：去除雜物 8 顆／修復瑕疵 8 顆／光線校正 免費／放大 2 倍 5 顆；即時合計
- [x] 2.3 修圖指令（選填）輸入
- [x] 2.4 對齊 Requirement「AI 修圖提供分項修飾與對比」：結果「原圖／修圖後」對比，顯示總消耗；重新修圖／下載／另存為新素材

## 3. 裁切預覽（MV-09c）

- [x] 3.1 裁切比例：原始／1:1／4:5／9:16／16:9／自訂；顯示寬高 px
- [x] 3.2 各通路預覽（IG 貼文／IG 限動／FB 貼文／LINE 圖文），標示是否被裁切邊緣
- [x] 3.3 對齊 Requirement「裁切提供各通路預覽且不扣飼料」：裁切與旋轉不扣飼料

## 4. 串接與驗證

- [ ] 4.1 擴充 `api.editImage`／扣款（`stores/feed`）與另存（`useAssets`）
- [x] 4.2 `npm run build` 通過、與設計稿視覺比對
- [ ] 4.3 為 `ImageEditorWorkspace.vue` 的字型選單、圖層面板、AI 修圖、裁切四個區塊各補 anchor，讓 `spectra drift` 對這四塊的改動有覆蓋：已在 design.md 新增「實作對照」章節，逐塊列出實際存在的程式符號（`fontOptions`／`layers`／`retouchOptions`／`cropRect` 等）與跨檔依賴；驗證：`spectra drift sync-mv-09-design` 顯示 anchor 數由 6 明顯增加，且四個區塊各自可個別偵測結構變動
