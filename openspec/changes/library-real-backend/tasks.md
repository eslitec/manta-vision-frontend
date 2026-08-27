## 1. 資料模型決策

- [x] 1.1 落地設計決策「決策 1：資料夾改成物件形狀，「未分類」用 unfiledCount 組裝」：在
  design.md 定案 `Folder { folderId, name, imageCount }` 型別，以及「未分類」由前端用後端的
  `unfiledCount` 組裝成虛擬項目、固定置頂的組裝規則
- [x] 1.2 落地設計決策「決策 2：分頁改成後端驅動，頁碼變動要重新請求」：定案前端 `pageSize`
  維持 8（不採用後端預設的 24）、換頁要重新呼叫 `GET /images`、`total`／`counts` 一律採信
  後端回傳值
- [x] 1.3 記錄開放問題「開放問題 A：素材物件要不要補寬高欄位」：兩個選項（後端補欄位／前端
  自行量測）寫進 design.md，標記為需要後端答覆才能定案，本 change 不代為決定
- [x] 1.4 記錄開放問題「開放問題 B：source／tag 五值對齊」：寫清楚前後端目前的欄位落差
  （`mediaType`／`source` 分離 vs 前端合併進單一 `tag`），並指出這會連帶影響決策 2 提到的
  「系統分類」計數邏輯，需要先問過後端語意是否一一對應才能動工

## 2. 批次操作決策與既有 spec 修正

- [x] 2.1 落地設計決策「決策 3：批次操作改成逐筆呼叫＋彙總，支援部分成功」：定案
  `BatchResult { succeededIds, failedIds }` 的統一彙總形狀，並確認 `Asset.referencedBy`
  （計數顯示）與後端 `isInUse`（刪除擋下旗標）是兩個不合併的欄位
- [x] 2.2 落地設計決策「決策 4：修正 spec 文件「素材可同時屬於多個資料夾」的錯誤描述」：
  確認 `types/asset.ts` 型別註解與 `mock.ts` 實作本來就是 1:1、跟後端一致，問題只在
  spec 文件的描述文字寫錯
- [x] 2.3 對齊 Requirement「批次移動素材到資料夾」：spec delta 改寫成 1:1 描述（移至＝取代
  原本的 `folderId`），拿掉「素材可同時屬於多個資料夾」這句錯誤描述
- [x] 2.4 對齊 Requirement「批次移出資料夾」：spec delta 改寫成「移出＝`folderId` 設回未分類」，
  拿掉「素材本身與其他資料夾歸屬不受影響」這句暗示多對多的描述
- [x] 2.5 對齊 Requirement「批次刪除素材需要明確確認」：spec delta 新增「部分成功（使用中
  素材被 `ASSET_IN_USE` 擋下）」情境，刪除確認彈窗結果要能區分「全部成功」與「部分成功」
- [x] 2.6 對齊 Requirement「素材清單分頁顯示」：spec delta 新增「換頁需要重新向後端請求」與
  「總筆數與分類計數採信後端回傳值」兩個情境，取代原本隱含的「本地已有全部資料」假設

## 3. 驗證

- [x] 3.1 逐條核對 design.md 四個決策與兩個開放問題，跟契約報告「最該先改的契約」第 3～5 項
  對應無誤，沒有遺漏或前後矛盾
- [x] 3.2 確認本 change 沒有動到 `src/` 任何檔案（`git diff --stat` 只列出
  `openspec/changes/library-real-backend/` 底下四個檔案）
- [ ] 3.3 使用者用自己安裝的 Spectra CLI 執行 `spectra validate library-real-backend --strict`
  與 `spectra analyze library-real-backend`，確認四個 Requirement 都有對應任務、Scenario
  都有 Example、沒有 capability 引用錯誤（雲端環境沒有安裝 Spectra，這一步無法由此 change
  代為執行，需要你在自己電腦上跑一次）
