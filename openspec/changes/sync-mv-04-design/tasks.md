## 1. 現況盤點

- [x] 1.1 確認 `GenerateVideoView.vue` 目前的實作狀態：來源圖片、動態模板、輸出比例、警示文字、預估消耗、生成按鈕皆為初版實作；送出後靠 `setInterval` 輪詢更新頁面內文字狀態，輪詢綁在元件生命週期上（離開頁面即停止），跟「背景任務」概念不相容；`ConfirmGenerateDialog` 已存在但尚未核對內容

## 2. 首頁精確比對（依使用者提供的第 1 張截圖）

- [x] 2.1 「從圖庫選擇」按鈕從 `GhostButton`（灰框）改成 `OutlineButton`（深藍框＋陰影），移除旁邊「或拖曳上傳」提示文字，改成滿版按鈕
- [x] 2.2 對齊 Requirement「選擇來源圖片、動態模板與輸出比例」：動態模板卡片加上縮圖區塊：卡片內先顯示一個置中播放圖示的縮圖框（`.tpl__thumb`，四個模板統一用同一個播放圖示，不是各自不同的圖示），縮圖框下方才是模板名稱；選取狀態改成卡片外框變深藍色＋文字加粗，縮圖框底色不隨選取狀態變化
- [x] 2.3 已選取的輸出比例樣式從深色填滿（深藍底、白字）改成外框樣式（白底、深藍框與文字）
- [x] 2.4 警示文字從「影片較慢（約 1–2 分鐘、不可取消），完成後會推播到通知中心。」改成「影片生成 飼料消耗較高，生成前會再次確認」
- [x] 2.5 「生成影片」按鈕圖示從播放三角形（`ti-player-play`）改成加號（`ti-plus`），跟圖生圖頁面的生成按鈕圖示一致

## 3. 非同步生成流程（依使用者補齊的 4 張截圖：確認生成彈窗、生成中背景任務樣式、完成通知、任務中心面板展開樣式）

- [x] 3.1 對齊 Requirement「送出生成前二次確認」：核對並修正「確認生成」彈窗（`ConfirmGenerateDialog.vue`）：文案從「無法中途取消」改成「會在背景生成，可離開頁面，完成後右上角『任務』通知你」；新增「使用模型」欄位（顯示模型名稱＋倍率＋單價）；「本次消耗」改成灰底卡片＋飼料瓶圖示；「剩餘飼料」也加上圖示；確認按鈕圖示從播放三角形改成「+」
- [x] 3.2 對齊 Requirement「生成中的背景任務與完成通知」：新增全域 `src/stores/generationTasks.ts`（`useGenerationTasksStore`），取代原本綁在 `GenerateVideoView.vue` 元件生命週期上的 `setInterval` 輪詢；`createVideoTask` 送出後立刻輪詢，不受頁面卸載影響；`GenerateVideoView.vue` 新增「4. 生成模型」步驟（標準×1／進階×2／專業×4），`VideoJobReq` 新增 `modelTier`，`createVideoJob` 依倍率計費；圖生圖（`GenerateImageView.vue`）也透過 `createImageTask` 接上同一個 store（記錄任務／通知，不改變原本同步等待的呈現方式）
- [x] 3.3 新增 `src/components/GenerationToast.vue`：生成完成／失敗時，右下角彈出通知卡片（綠勾／警示圖示＋標題＋訊息＋「查看」連結導去圖庫＋關閉按鈕），6 秒後自動消失；掛載在 `DefaultLayout.vue`，全站共用同一份
- [x] 3.4 對齊 Requirement「任務中心面板」：新增 `src/components/TaskCenterPanel.vue`：頂部工具列「任務」按鈕點擊後展開面板，列出所有任務（縮圖、名稱、進度條／已完成／失敗狀態、取消／查看／重試操作），底部有退款規則說明文字；「任務」按鈕本身：有未讀完成／失敗任務時顯示數字徽章，沒有未讀但有進行中任務時顯示綠點
- [x] 3.5 `getVideoJob` 的 mock 實作新增 12% 機率的隨機失敗（`MODEL_TIMEOUT`），只在 processing 階段判定一次並快取結果，讓失敗／退款／重試流程在 mock 環境下真的可能被觸發，不是永遠不會發生的假狀態；`mock.spec.ts` 補上依模型倍率扣款的測試，並確認既有的「queued → done」測試因為跳過 processing 區間，不受這個新機率影響
- [x] 3.6 `LibraryView.vue` 圖庫格線讀同一份 `generationTasks` store，在「全部素材」第一頁顯示 `kind === 'video'` 且進行中的任務卡片（縮圖、進度條、狀態文字），完成後任務會離開清單、真正的素材會出現在格線裡——這同時完成 `sync-mv-01-design` 原本標記「待處理」的任務 7.1（跟頂部任務徽章共用同一份資料來源）

## 4. 驗證

- [x] 4.1 每項修改後執行 `npm run build`（含 `vue-tsc` 型別檢查），確認通過；第 3 節完成後又發現 `src/api/mock.spec.ts` 因為 `VideoJobReq` 新增必填的 `modelTier` 而型別報錯，補上欄位與一則新測試後全部通過
- [x] 4.2 啟動本機開發伺服器，用瀏覽器實際渲染結果（DOM／CSS 斷言、截圖）驗證第 2 節每一項修改
- [x] 4.3 執行 `vitest run`，48 個單元測試全部通過（含新增的「依生成模型倍率扣款」測試）
- [x] 4.4 使用者於瀏覽器實際操作生成流程並截圖回報（含本輪新增的「生成中」進度區塊與取消任務）；build＋48 單元測試通過

## 9. MCP 校正 + 生成中進度狀態實作（對齊設計稿 MV-04c）

- [x] 9.1 對齊 Requirement「圖生影頁面呈現對齊設計稿」：系統版面：面板 380 → 400px、gap 20 → 16px、內距 22 → 24px、模板格 gap 10 → 12px
- [x] 9.2 新增「套用品牌設定」開關（共用 `BrandToggle`）
- [x] 9.3 生成中狀態實作完整進度區塊：狀態列「生成中（步驟 N/4：階段）」+ 圓角狀態點（#606692）、進度條（軌 `#EFF2FA`／填 `#2E3567`、6px）、百分比 + 剩餘時間、說明文字、「取消任務」鈕
- [x] 9.4「取消任務」接既有的 `tasksStore.cancelTask()`（取消並退還飼料）
- [x] 9.5 `generationTasks` store 的 processing 進度改為平滑遞增（原本固定 55%，進度條不會動）
- [x] 9.6 build 通過

## 10. 2026-08-10 規格校正：移除主畫面品牌設定

- [x] 10.1 實作 Requirement「主畫面不呈現品牌設定」：從 MV-04 主畫面移除 `BrandToggle`，確認其他頁面的共用品牌設定開關不受影響
- [x] 10.2 保留「4. 生成模型」與標準／進階／專業三種選項，維持 `modelTier` 型別與倍率計費
- [x] 10.3 確認 MV-04b 視窗顯示主畫面已選模型、倍率與對應消耗
- [x] 10.4 以 1366×940 比對 MV-04 主框，確認移除品牌設定後的間距、警示列與底部操作對齊設計稿：第 11 節完成 `footer_sticky` 結構後，以 Playwright 在 1366×940 重新截圖並量測 DOM，確認整頁無垂直捲軸（`document.documentElement.scrollHeight === window.innerHeight === 940`）、`.video`／`.video__input` 皆為 823px（對齊 `panel_config` node `491:9015`）、`scrollbar_hint` 兩種狀態的位置與高度（top 16px／552px、644px）精確對齊 design.md 記錄的數值；捲動區與 sticky footer 的實際切分（688/135、743/80）與設計稿（690/133、745/78）各差 2px，屬真實文案／圖示撐開的合理誤差，兩者總和仍精準對齊 823px
- [x] 10.5 執行 `npm run build`、`npm test -- --run`、`spectra validate sync-mv-04-design --strict`、`spectra analyze sync-mv-04-design`

## 11. 2026-08-21 設定面板 sticky footer（版面結構）

- [x] 11.1 `GenerateVideoView.vue` 左欄改為固定高兩段式結構：`.panel`／`.video__input` 補上高度與 `min-height: 0` 約束（參考 `sync-mv-01-design` 任務 10.1 對共用內容容器的處理），步驟 1～4 包進 `flex: 1; overflow-y: auto; min-height: 0` 的捲動容器，`.video__sticky` 加 `flex-shrink: 0`。根因：`.video__sticky` 的 `margin-top: auto` 已存在且寫法正確，但 `.panel` 沒有高度上限、被內容一路撐高，`auto` 沒有剩餘空間可推，才導致整頁捲動。驗證：1366x940 下整頁無垂直捲軸，捲動只發生在設定面板內部
- [x] 11.2 `footer_sticky` 高度隨警示列存在與否切換：初始狀態含 `row_warn` 為 133，送出生成後警示列消失、收合為 78；上緣 `1px solid #d2d5dd`、內距 `14px 24px 24px`、警示列與 `row_cta` 間距 11px；左側「預估消耗」（12px `#b4b9c4`）＋飼料圖示 16px＋金額（16px Bold `#ea903a`），右側生成按鈕靠右。驗證：捲動時該區塊固定不動，且兩種高度切換時捲動區與遮罩位置跟著改變
- [x] 11.3 補上 `scroll_fade`（高 28、白色由透明漸層，貼齊捲動區底緣，初始狀態 top 662／其餘 717）與 `scrollbar_hint`（寬 4、`#b4b9c4` 50% 透明、圓角 2、距右緣 8，初始狀態高 552／其餘 644）；注意漸層需放在捲動容器之外，否則會跟著內容捲走（同 MV-09 字型選單的處理方式）
- [x] 11.4 取得 MV-04 初始狀態的 Figma 節點，確認警示列歸屬：已由 node `13:2` 確認 `row_warn`（`275:3079`，352x44）位於 `footer_sticky` 內，與 `row_cta` 同屬釘底區，目前實作放在 `.video__sticky` 是正確的；並記錄五個狀態的 footer 高度差異（初始 133／其餘 78），見 design.md 同日決策
- [x] 11.5 `npm run build`、`npm test -- --run` 通過，並以 1366x940 重新截圖比對
