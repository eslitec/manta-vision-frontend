# Spectra 導入與變更健檢清單

日期：2026-08-10  
分支：`feature/mv-00-05-consolidated`  
基準：Figma `MantaGO-draft`、Spectra CLI 2.3.1、commit `69e2f23`

## 結論

Spectra 已安裝且專案已初始化，`spectra validate --all --strict` 全部通過；目前的主要問題不是安裝失敗，而是規格文件、完成勾選與後續程式變更之間出現輕度 drift。

官方工作流為 `discuss → propose → apply → ingest → archive`。這一批 MV00～MV05 尚在 PR 分支，應先使用 ingest 的概念補回規格與任務，不要先 archive，也不需要為同一批視覺校正另開一組重複 change。

## 已確認的 MV-04 決策

- [x] MV-04 主畫面保留「生成模型」選擇器
- [x] MV-04 主畫面不顯示「套用品牌設定」
- [x] 影片生成依使用者選擇的模型倍率計費
- [x] MV-04b 確認視窗顯示已選模型與對應消耗摘要
- [x] 從 MV-04 程式碼移除品牌設定並保留生成模型／動態費用
- [ ] 重新截圖驗收 MV-04 主畫面

## PR 合併前需要處理

### P0：保持規格與實作一致

- [ ] 對 `sync-mv-00-design`～`sync-mv-05-design` 執行一次 ingest 式更新，把 commit `69e2f23` 的 RWD、間距、結果操作與合規流程補回 design／spec／tasks
- [x] 移除 `sync-mv-04-design` proposal 中尚未定案的 `home-workbench-ui` capability 引用
- [ ] 修正 `spectra analyze` 剩餘 2 個錯誤 capability 引用：`sync-mv-01-design`、`sync-mv-02-design` 的 proposal 引用了 `home-workbench-ui`，但 change 內沒有對應 delta spec
- [ ] 修正 `sync-mv-00-design` 的失效 anchor：已移除的 `src/lang/zh-Hant.ts` 與被誤判為 CLI flag 的 `--wide`
- [ ] 修正 `sync-mv-01-design` 中被誤判為 CLI flag 的 `--folder`
- [ ] 把重要 Requirement 對應到 tasks；目前多份 spec 雖然有效，但 `spectra analyze` 仍回報 Requirement 沒有 matching task

### P1：依 Figma Audit 校正

- [x] MV00：統一頭像顏色、統計卡分隔線與垂直間距
- [x] MV01：讓分頁在 1366×940 首屏可見，避免素材區把整頁撐出不必要的垂直捲軸；資料筆數差異維持 mock data
- [ ] MV02：明確記錄「初始空狀態」與「生成完成狀態」；確認 2 張 × 8 顆應為 16 顆，避免照抄設計稿的 8 顆
- [x] MV03：確認初始／完成狀態切換正確；品牌設定說明補入「文案語氣」
- [ ] MV04：保留生成模型、移除品牌設定，完成 `sync-mv-04-design/tasks.md` 第 10 節
- [x] MV05：品牌設定預設改為關閉，並記錄空狀態／完成狀態與結果操作列；已完成 1366×940 驗證

### P1：整理 change 生命週期

- [ ] `sync-mv-06-design`～`sync-mv-09-design` 目前為 0% 卻有 started marker；若近期不做，使用 Spectra Park 收起
- [ ] `sync-components-buttons` 與 MV00～MV05 在 PR 合併前保持 active，完成驗收後再 archive
- [ ] PR 合併後依序執行 validate、analyze、drift、archive，讓完成的 delta spec 合併進正式 specs

### P2：補強專案上下文

- [ ] 在 `openspec/config.yaml` 補上 Vue 3、TypeScript、Vite、Pinia、Pug、SCSS、Vitest、Figma 檔案與測試指令等 context
- [ ] 在 `.spectra.yaml` 啟用團隊實際使用的 AI tool instruction files；目前 `tools` 全部被註解，Codex／Claude 不會由 `spectra update` 產生專案指令
- [ ] 確認 `.spectra.yaml` 的產出語言設定；目前是 `locale: en`，但既有規格主要使用繁體中文

## 每次 change 的建議流程

1. `spectra status <change>`：確認 artifact 是否齊全。
2. `spectra analyze <change>`：先處理矛盾、缺口與沒有對應 task 的 requirement。
3. `spectra drift <change>`：確認程式檔案與 anchor 沒有失效。
4. 開發中需求改變時更新同一個 change（ingest），不要只改程式或把舊 task 維持完成。
5. 完成後執行 build、test 與 `spectra validate <change> --strict`。
6. PR 合併並確認不再修改後才 `spectra archive <change>`。

## 本次唯讀健檢結果

- `spectra validate --all --strict`：11 個 active changes 全部有效
- `spectra drift`：MV00、MV01 有少量 broken anchors；其餘 MV02～MV05 與共用按鈕為 light drift
- `spectra analyze`：主要是 capability delta 缺檔、Requirement 未連到 task、Scenario 缺少具體 example
- MV00～MV05 tasks 原先均為 100%，但最後一次文件同步後仍有 15 個程式檔、1,117 行新增與 417 行刪除，需在 archive 前補回規格

參考：

- https://github.com/kaochenlong/spectra-app
- https://spectra.5xcamp.us/
