## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 MV09 11 個子畫面（`615:5312` 底下）的精確節點資料，找出與實作有落差的畫面
- [x] 1.2 加入物件改為框選＋文字描述生成流程，移除素材庫疊圖路徑（commit `9f19f41`）
- [x] 1.3 指令修圖改為常用指令快速鍵＋一口價計費，移除跟快速修飾共用的分項勾選清單（commit `9f19f41`）
- [x] 1.4 裁切選定固定比例後顯示套用結果徽章與復原/重新裁切/另存操作（commit `9f19f41`）
- [x] 1.5 背景移除執行中顯示畫布處理覆蓋層（commit `9f19f41`）
- [x] 1.6 AI 修圖比對面板在處理中顯示進度狀態（commit `9f19f41`；後續於第 3 節反轉「不做秒數倒數」這個決策）
- [x] 1.7 `npx vue-tsc --noEmit` 與 `npx eslint` 都跑過確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：更新「AI 工具即時扣款並顯示成本」「AI 修圖提供分項修飾與對比」「裁切提供各通路預覽且不扣飼料」三個 Requirement 的內容／Scenario／trace
- [x] 2.2 `openspec/specs/image-editor-ui/spec.md`：新增「加入物件為文字描述生成，非從圖庫疊圖」Requirement

## 3. AI 修圖 loading box 後續調整（ingest，2026-09-07）

> 以下 3 個 commit 反轉了任務 1.6 當初「不虛構秒數倒數」的決策，並修正 loading box 的圖示與進度條行為，均由使用者在另一個 session 完成（commit `408f2cf`／`a376fc1`／`3825fcc`／`c086f5e`）。這裡補記文件，不重新實作。

- [x] 3.1 補上「約剩 X 秒」倒數文字（commit `408f2cf`）：新增 `retouchSecondsRemaining` ref 與每秒遞減計時器，`en.ts` 補齊 `editor.retouch.inProgress`／`stepLabel`／`timeRemaining` 三個缺漏 key
- [x] 3.2 spinner 圖示改用 Figma 原始路徑（commit `a376fc1` 手刻版 → `3825fcc` 改用使用者提供的原始匯出 SVG 路徑修正）：新增 `IconSpinnerRing.vue`，取代 loading box 裡形狀不符的 `IconAiSparkle`
- [x] 3.3 進度條改成依時間軸從 0% 漸進到 100%（commit `c086f5e`）：新增 `retouchTotalSeconds`，`retouchProgressPercent` 改成「已過秒數 ÷ 估計總秒數」，不再用選取項目數換算造成開場就跳到 50% 的問題；軌道背景色修正為 Figma 實際值 `#EFF2FA`
- [x] 3.4 對齊 Requirement「AI 修圖提供分項修飾與對比」：更新 `openspec/specs/image-editor-ui/spec.md` 的「AI 修圖執行中顯示處理進度」Scenario，補上倒數秒數文字與進度條「從 0% 漸進」的行為描述，trace 加上 `src/components/icons/IconSpinnerRing.vue`
- [x] 3.5 `npm run lint` 與 `npx vue-tsc --noEmit` 都跑過確認無錯誤（於本次 ingest 補跑一次，確認 2026-09-07 這 4 個 commit 疊加後的最終狀態仍乾淨）

## 4. 驗證（第一輪，2026-09-07）

- [x] 4.1 執行 `spectra validate fix-mv09-editor-figma-mismatches --strict` 與 `spectra analyze fix-mv09-editor-figma-mismatches`，確認沒有 CRITICAL／WARNING 級別的發現（`validate` 通過，`analyze` 顯示 Coverage／Gaps Clean，僅有預期中的「No delta specs found」提示——本 change 沿用直接套用進主 spec 的既有模式，不建 delta spec）

## 5. 背景移除覆蓋層對齊 Figma（ingest，2026-09-08）

> 任務 1.5 當初做的背景移除覆蓋層（commit `9f19f41`）借用了修圖 loading box 的 `IconAiSparkle` 圖示與隨手選的間距／顏色，沒有真的比對過覆蓋層自己的 Figma node。commit `cf7269b` 補上這次比對與修正。

- [x] 5.1 對齊 Requirement「AI 工具即時扣款並顯示成本」（commit `cf7269b`）：比對 Figma node `1311:1042`（overlay_processing）後修正——spinner 換成 `IconSpinnerRing`（跟修圖 loading box／`1311:815` 同一顆）取代形狀不符的 `IconAiSparkle`，尺寸 32px → 40px；取消按鈕從 `size="compact"` 改回不帶 `size`（吃 `AppButton` 預設 medium，對齊節點 `1311:1048` 量出來的 36px 高／18px 圓角／9px·16px padding）；疊層背景 `rgba(255,255,255,0.92)` → `0.96`、元素間距 `6px` → `12px`、副標文字色 `#9299aa` → `#606692`，並補上 `border-radius: 4px` 避免疊層方角蓋住外層 `.artboard` 的圓角邊框
- [x] 5.2 `openspec/specs/image-editor-ui/spec.md`：「背景移除執行中顯示處理覆蓋層」Scenario 補上覆蓋層背景透明度、圓角、spinner 圖示與尺寸、取消按鈕尺寸的具體規格，trace 加上 `src/components/icons/IconSpinnerRing.vue`、日期更新
- [x] 5.3 `npx vue-tsc --noEmit` 確認無錯誤

## 6. 驗證（第二輪，2026-09-08）

- [ ] 6.1 執行 `spectra validate fix-mv09-editor-figma-mismatches --strict` 與 `spectra analyze fix-mv09-editor-figma-mismatches`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 6.2 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-editor-figma-mismatches`
