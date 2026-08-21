## Context

見 `proposal.md` 的 Why。這個 change 延續 MV-00/01/02 建立的人工比對流程。`GenerateVideoView.vue` 目前已有基本雛型：來源圖片、動態模板（4 種）、輸出比例（3 種）、警示文字、預估消耗與生成按鈕，送出後靠 `setInterval` 輪詢 `api.getVideoJob` 更新 `preview__box` 裡的文字狀態（排隊中／生成中／已完成），元件卸載時會清掉輪詢（`onUnmounted(clear)`）。這個輪詢完全綁在目前這個頁面元件的生命週期上，使用者一旦離開頁面，輪詢就會停止——跟使用者這次提到的「背景任務」「任務中心面板」概念不相容，背景任務必須能在使用者離開頁面之後仍持續追蹤。

`ConfirmGenerateDialog` 元件已存在並已接到「生成影片」按鈕（點擊後開 `confirmOpen`，確認後呼叫 `startGenerate`），但尚未依這次的設計稿核對內容是否吻合。

首頁部分已依使用者提供的截圖完成第一輪比對與修正（見 `tasks.md` 第 2 節）：「從圖庫選擇」改用 `OutlineButton`（原本用 `GhostButton`，且拿掉旁邊的「或拖曳上傳」提示文字，變成滿版按鈕）；動態模板卡片加上統一的播放圖示縮圖區塊（原本只有圖示＋文字的簡單按鈕）；已選取的輸出比例改成外框樣式（原本是深色填滿樣式）；警示文字改為「影片生成 飼料消耗較高，生成前會再次確認」（原本講的是生成速度慢／不可取消）；生成按鈕圖示改成 `+`（原本是播放三角形）。

使用者提到的另外 4 張截圖（確認生成彈窗、生成中背景任務樣式、完成通知、任務中心面板展開樣式）後續已分批送達（MV04b～MV04e，中間有多次因為整頁 SVG 在 5 萬字元處被截斷而重傳，最終改用截圖才成功），確認生成彈窗那張重複收到兩次但內容足夠清楚，四張畫面內容已足以規劃並實作完整的非同步生成流程，見下方 Decisions。

## Goals / Non-Goals

**Goals:**

- 讓 `GenerateVideoView.vue` 首頁的視覺呈現對齊設計稿（已完成第一輪）。
- 補齊非同步生成的完整體驗：確認彈窗、背景任務、完成通知、任務中心面板——目前只有輪詢更新頁面內文字這種最小雛型，跟真正的「背景任務」（離開頁面仍持續追蹤）不是同一件事。

**Non-Goals:**

- 圖生圖（MV-02）目前的生成是同步等待（mock API 立即回傳結果），這次不刻意讓它「看起來」變成非同步（不加假延遲、不加確認彈窗）——只是讓它的任務紀錄／通知走同一套 store，UI 呈現維持原樣。

## Decisions

- **新增全域 Pinia store `src/stores/generationTasks.ts`（`useGenerationTasksStore`），取代原本綁在 `GenerateVideoView.vue` 元件生命週期上的 `setInterval` 輪詢。** 這是這次範圍擴大後唯一合理的做法：頂部工具列的任務徽章、圖庫格線的生成中卡片、任務中心面板三處都要讀同一份「目前有哪些任務、各自進度」的資料，如果資料留在頁面元件內，其他地方讀不到；搬到全域 store 後，任務建立時就交給 store 自己輪詢（`poll()` 內部用 `setInterval`），不再依附任何頁面元件的掛載狀態，使用者離開 `GenerateVideoView.vue` 後任務仍會繼續跑、繼續更新。
- **圖生圖（MV-02）也接上同一個 store（`createImageTask`），但不是讓它變成真正的非同步流程。** `api.generateImages` 本身是同步的（mock 立即回傳陣列），`createImageTask` 只是在呼叫前後各記一筆任務狀態（`processing` → `done`/`failed`），讓這筆生成同樣出現在任務中心清單與頂部徽章的計數裡；不額外加確認彈窗、不模擬假的等待時間——因為目前沒有任何截圖規定圖生圖要有這些東西，硬加會是無依據的臆測。跟影片生成共用同一個 `kind` 欄位（`'image' | 'video'`）區分呈現細節（例如圖庫格線的生成中卡片只顯示 `kind === 'video'`，因為圖片生成幾乎不會被使用者看到「進行中」狀態）。
- **任務中心面板／頂部徽章／圖庫生成中卡片，三處共用同一份 `tasks` 陣列，各自過濾出自己要顯示的子集，而不是各自維護一份資料。** 頂部徽章：`unreadCount`（已完成／失敗但未讀）優先顯示數字，沒有未讀但有進行中任務時顯示綠點；任務中心面板：完整列出所有任務；圖庫格線（`LibraryView.vue`）：只在「全部素材」第一頁、且 `kind === 'video'`、且狀態為 `queued`/`processing` 時顯示——因為這些任務還沒有真正的資料夾／分類歸屬，不該出現在特定資料夾或系統分類的篩選結果裡。
- **`getVideoJob` 的 mock 實作加入 12% 機率的隨機失敗（`error: 'MODEL_TIMEOUT'`），只在 `processing` 階段（`elapsed` 落在 1.5~5 秒之間）判定一次並快取結果（`failedChecked` 旗標），避免同一個任務被反覆擲骰子。** 這是為了讓設計稿裡明確畫出的「生成失敗・模型逾時，已退還 45 顆」這個狀態、以及對應的退款與「重試」流程，在 mock 環境下真的可能被觸發與測試到，不是永遠不會發生的假狀態。這個判定用 `elapsed` 區間門檻（而非每次呼叫都擲骰子），現有測試 `mock.spec.ts` 用 `vi.spyOn(Date, 'now')` 直接從 `elapsed≈0` 跳到 `elapsed>5000`，完全跳過 processing 區間，所以不會被這個新機率判定影響，維持決定性（deterministic）。
- **2026-08-10 規格校正：MV-04 主畫面保留生成模型選擇，但不顯示套用品牌設定。** 標準×1／進階×2／專業×4 仍是 `GenerateVideoView.vue` 的第 4 步，`VideoJobReq.modelTier` 與依倍率計費的行為維持不變；MV-04b 確認視窗顯示使用者已選模型、倍率與本次消耗。這項決策只取代後續在主畫面新增 `BrandToggle` 的作法，不推翻生成模型與倍率計費。
- **「取消」與「重試」都是前端層面的操作，沒有對應的後端 API。** 取消：清掉輪詢 timer、把任務從清單移除、呼叫既有的 `refundFeed` 退款；重試：用任務上保留的原始請求參數（`videoReq`）重新呼叫 `createVideoTask` 建立一筆全新任務，移除舊的失敗紀錄——語意上更接近「重新提交一次」而不是「讓同一筆任務復活」，避免要處理「同一個 task id 但底層 job id 換了」這種容易出錯的狀態同步問題。

## Risks / Trade-offs

- [背景任務需要脫離頁面元件的生命週期，改用全域 Pinia store 管理，這是比單純視覺校對更大的架構調整，影響 `GenerateVideoView.vue`、`GenerateImageView.vue`、`DefaultLayout.vue`、`LibraryView.vue` 四個檔案] → 已完成：新增 `generationTasks` store，四個檔案改成讀寫同一份資料，見上方 Decisions。
- [任務中心面板涉及共用外殼 `DefaultLayout.vue`] → 只改 `.topbar` 相關的按鈕與新增的 `TaskCenterPanel`／`GenerationToast` 掛載點，不動 `.sidebar` 區塊——使用者自己在 `DefaultLayout.vue` 有一份尚未提交的 sidebar 樣式實驗，刻意避開衝突。
- [`getVideoJob` 新增的隨機失敗機率，如果之後有人寫模擬「每秒真實輪詢」的測試（例如用 fake timers 逐秒推進），可能因為隨機性造成測試不穩定] → 目前 `mock.spec.ts` 沒有這樣的測試，暫不處理；之後如果真的需要，用 `vi.spyOn(Math, 'random')` 固定回傳值即可讓測試決定性。
- [Playwright MCP 工具這次驗證時斷線，無法用瀏覽器實際點擊完整流程（生成→確認彈窗→任務中心→完成通知）] → 已完成 `npm run build`、`vitest run`（48 個測試全過）、dev server 主要路由 HTTP 200 驗證；完整互動流程的瀏覽器驗證待 Playwright 恢復連線後補做，或請使用者自行操作回報問題。

## 2026-08-21 版面結構落差：設定面板缺少 sticky footer

比對 Figma `panel_config`（node `491:9015`，取自 MV-04c `491:9008`）後發現，目前 `GenerateVideoView.vue` 的左欄是「整欄一路往下長」，而設計稿是**兩段式固定高結構**：

```
panel_config      400 x 823   白底、圓角 10、陰影 0 4px 7px rgba(96,100,114,.2)
├── scroll_area   400 x 745   overflow-y: auto，內距 24/24/12，項目間距 16
├── footer_sticky 400 x 78    flex-shrink: 0，上緣 1px #d2d5dd
│                             內距 pt 14 / px 24 / pb 24
│                             左：預估消耗（12px #b4b9c4）+ 飼料圖示 16px
│                                 + 金額（16px Bold #ea903a）
│                             右：生成影片按鈕
├── scroll_fade   400 x 28    絕對定位 top 717，白色由透明漸層
└── scrollbar_hint  4 x 644   絕對定位 left 392 top 16，#b4b9c4 50%，圓角 2
```

**設計稿一開始就預期設定面板需要捲動**（所以才有漸層遮罩與捲軸提示），但「預估消耗」與「生成影片」按鈕放在 `footer_sticky` 裡，**不隨內容捲動、永遠可見**。

目前實作沒有這層結構，在 1366x940 下警示列被截斷、生成按鈕完全落在視窗外。這不是間距誤差，是版面結構未實作，因此另立第 11 節處理。

補充兩點：

- 設計稿的 `scroll_area` 內仍含 `brand_toggle`（`491:9047`，352x53），但主畫面移除品牌設定是第 10 節已定案的決策，以實作為準；移除後 `scroll_area` 內容減少約 69px，仍會超出可視高度。
- 「4. 生成模型」的標題在設計稿即為 14px Medium（`491:9040`），與步驟 1～3 的 16px Bold 不同，是為了與右側「倍率以標準模型 45 顆／支 為基準」（11px `#b4b9c4`）並排。目前實作的 `.step__head .step__title` 已正確對應，非缺陷。

## Open Questions

（目前已無未解決的問題；背景任務資料放在全域 Pinia store、任務中心面板同時涵蓋影片與圖片生成任務，以及 MV-04 主畫面保留生成模型但不提供品牌設定，皆已在 Decisions 中定案。）
