<!-- SPECTRA:START v1.0.2 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra-*` skills when:

- A discussion needs structure before coding → `/spectra-discuss`
- User wants to plan, propose, or design a change → `/spectra-propose`
- Tasks are ready to implement → `/spectra-apply`
- There's an in-progress change to continue → `/spectra-ingest`
- User asks about specs or how something works → `/spectra-ask`
- Implementation is done → `/spectra-archive`
- Commit only files related to a specific change → `/spectra-commit`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `/spectra-apply` and `/spectra-ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

# CLAUDE.md

給 Claude（或其他 AI 協作工具）在這個 repo 工作時的指引。

> **先讀這兩節**：程式修改一律走 [Spectra 流程](#spectraspec-driven-development-所有程式修改的預設流程)；每完成一個功能就依 [Commit 規範](#commit-規範重要) 提交。

## 專案概要

Manta Vision 前端。Vue 3 + TypeScript + Vite，SFC 的 template 用 **Pug**，樣式寫在 SFC 內（部分共用樣式在 `src/assets/scss/`），狀態用 Pinia，多語系用 vue-i18n。

常用指令：

| 指令                        | 用途                                                    |
| --------------------------- | ------------------------------------------------------- |
| `npm run dev`               | 開發伺服器                                              |
| `npm run build`             | `vue-tsc --noEmit` 型別檢查 + build（**改完務必跑過**） |
| `npm run lint` / `lint:fix` | ESLint                                                  |
| `npm run format`            | Prettier（`src/`）                                      |
| `npm test`                  | Vitest                                                  |

## Commit 規範（重要）

**每完成一個功能就 commit 一次，不要累積。** 不用等使用者再開口要求。

訊息格式遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hant/v1.0.0/)，沿用 repo 既有慣例：

```
<type>(<scope>): <繁體中文描述>

<可選的 body：為什麼這樣改、依據哪個 Figma node、取捨了什麼>
```

- 常用 type：`feat`、`fix`、`refactor`、`style`、`docs`、`chore`
- scope 用模組名，例如 `editor`、`library`、`image`、`i18n`、`components`、`picker`、`openspec`
- 標題與 body 都寫繁體中文；技術名詞（元件名、node id、色碼）保留原文
- 對齊設計稿的改動，body 請寫上 Figma node id，方便日後回溯

參考既有紀錄：

```
feat(editor): 依 Figma 重製「另存為新素材」對話框並串接選項
style(picker): 選取徽章改用綠色打勾以對齊 Figma sel_check
refactor(library): 資料夾改回 1:N（移至＝替換 folderId、移出＝回未分類）
```

### Commit 前必做

1. **只 stage 這次改動相關的檔案。** 工作目錄經常有一批與當前任務無關的既有變更，`git add -A` 會把它們一起帶進來。逐一列出檔案路徑再 `git add`。
2. 跑過 `npm run build`（型別）與 `npm run lint`；至少確認 `npx prettier --check <改動的檔案>` 通過。
3. 不要主動 `git push`，除非使用者明講。

## 撰碼慣例

- **樣式單位**：字體、元件尺寸、間距、定位偏移用 `rem`（16px baseline 換算）；border、radius、shadow、breakpoint、outline、SVG 幾何值維持 `px`。
- **多語系**：任何新的 UI 字串都要同時補 `src/lang/en.ts` 與 `src/lang/zh-Hant.ts`，兩邊的 key 結構必須一致，不可只改一邊。
- **圖示**：多色／多路徑的插畫用 `src/components/icons/` 底下的行內 SVG 元件；單色線稿圖示可用 `@tabler/icons-webfont`（`i.ti.ti-*`）。
- **格式化**：Prettier 設定在 `.prettierrc.json`，不要手動調整縮排或引號風格去對抗它。

## 對齊 Figma 設計稿

設計檔：MantaGO draft（fileKey `ysYFocN2TtBSeJHdGS5d7R`）。

- 優先用 Figma MCP 的 `get_design_context` 取得精確數值，不要靠肉眼比對截圖猜。
- `line-height` 一律換算成無單位比例（例如 22px ÷ 16px → `1.375`），不寫死 px，字級調整時行高才會跟著縮放。
- **清單／選項類 UI 要與設計稿逐項一致，不多不少。** 例如編輯器的字型選單就是 Figma `list_font`（node `1157:872`）的九個字體家族，不可自行增刪。
- 色碼直接抄設計稿的值，不要用「看起來很接近」的既有變數替代。

## Spectra（spec-driven development）— 所有程式修改的預設流程

本專案已導入 [Spectra](https://github.com/kaochenlong/spectra-app)（[說明頁](https://spectra.5xcamp.us/)）。Spectra 是 OpenSpec 工作流的桌面應用，資料格式與 OpenSpec 相容，因此規格仍放在 `openspec/`。

**以後任何程式修改都要走 Spectra 流程，不要直接改檔案就送出。** 包含視覺校正、bug 修正、小重構在內；真正的例外只有純文件與設定檔的錯字修正。

專案現況：`.spectra.yaml`（設定）、`.spectra/changes/`（Spectra 狀態）、`openspec/changes/`（提案與規格）、`openspec/config.yaml`（專案上下文）都已初始化。`SPECTRA-CHANGE-CHECKLIST.md` 記錄了上一次健檢的結論與待辦，動手前先看過。

### 官方工作流

`discuss → propose → apply → ingest → archive`

對應的 Claude Code slash commands：

| 指令               | 用途                                           |
| ------------------ | ---------------------------------------------- |
| `/spectra-discuss` | 聚焦的設計討論                                 |
| `/spectra-propose` | 產生 proposal / spec / design / tasks 四份文件 |
| `/spectra-apply`   | 依 tasks 實作                                  |
| `/spectra-ingest`  | 開發中需求變動時，把實作回補進規格             |
| `/spectra-archive` | 完成後歸檔                                     |
| `/spectra-debug`   | 系統化除錯（最多 3 次嘗試）                    |
| `/spectra-ask`     | 用自然語言查規格（RAG 向量檢索）               |

Spectra 也支援 `spx/<change-name>` 分支隔離，以及 `spectra park <name>` / `spectra unpark <name>` 暫時收起進行中的 change。

### 每個 change 的檢查順序

1. `spectra status --change <change>` — 確認 artifact 是否齊全（注意 `status` 吃 `--change`，不是位置參數）
2. `spectra analyze <change>` — 先處理矛盾、缺口、沒有對應 task 的 requirement
3. `spectra drift <change>` — 確認程式檔案與 anchor 沒有失效
4. 需求中途變動就更新同一個 change（ingest），**不要只改程式、也不要把舊 task 硬留成完成**
5. 完成後跑 `npm run build`、`npm test`、`spectra validate <change> --strict`
6. **PR 合併並確認不再修改之後**才 `spectra archive <change>`

### 歸檔前務必清空工作目錄（已實測）

**跑 `spectra archive` 之前先確認 `git status` 乾淨**（該提交的提交、該 stash 的 stash）。

`spectra archive` 會在合併後的主 spec 裡注入 `<!-- @trace -->` 區塊，而它的 `code:` 清單**與 change 自身的文件完全無關**。2026-08-21 前後兩輪實測：

**第一輪（單獨歸檔三次）**

| 歸檔時 git 狀態                                | 產出                                |
| ---------------------------------------------- | ----------------------------------- |
| 工作目錄有一個無關的 `BACKEND.md` 未提交       | 3 段 `@trace`，`code: - BACKEND.md` |
| 工作目錄乾淨，前一個 commit 只動 `openspec/**` | **完全不注入 `@trace`**             |
| 工作目錄乾淨，前一個 commit 動過 `CLAUDE.md`   | 5 段 `@trace`，`code: - CLAUDE.md`  |

**第二輪（工作目錄乾淨，一次連續歸檔 11 個 change）**

結果比第一輪更糟：11 個 capability、**58 段 `@trace` 全部拿到同一份 99 個檔案的清單**——等於整個 `src/` 加上 `package.json`、`tsconfig.json`、`index.html`、`design-qa.md`，甚至包含早就被刪掉的 `src/components/PrimaryButton.vue`。飼料用量統計（`usage-stats-ui`）被標上 `ImagePickerDialog.vue`，圖片編輯器被標上 `usage-legend-daily.svg`，諸如此類。

**`.spectra/touched/` 不是資料來源。** 之前記載「本專案不存在這個目錄」，這點要更正：跑過 `/spectra-apply` 之後它確實會生成（本專案有 `sync-mv-04-design.json`）。但第二輪歸檔時 `sync-mv-04-design` 有這份 touched 檔，拿到的 `@trace` 仍舊是那份 99 檔清單，跟其他 10 個一模一樣——**所以 CLI 根本沒讀它**。

**結論：`@trace` 的自動注入目前不可用，一律當成需要人工覆寫的欄位。**

歸檔後必做，先檢查：

```powershell
Select-String -Path openspec\specs\*\spec.md -Pattern "@trace","TBD"
```

再逐一覆寫。可靠的來源是**該 change 自己 `proposal.md` 的 `## Impact` 章節**——那是當初寫下的實際影響範圍。做法：從歸檔後的 `openspec/changes/archive/<date>-<name>/proposal.md` 取出 Impact 列出的檔案路徑，去掉已不存在的（例如被整併掉的舊元件），再視情況補上該 capability 明顯相關但 Impact 漏寫的檔案，然後把該 spec 內所有 `@trace` 的 `code:` 換成這份清單。同一個 capability 內共用一份清單即可，不必逐 Requirement 細分。

「沒有連結」遠好過「錯誤的連結」——真的整理不出來就整段刪掉。

另外注意：**CLI 沒有 `unarchive` 子指令**。`spectra archive` 輸出的「Snapshot created for unarchive support」指的是桌面 App 的功能。用 CLI archive 錯了只能靠 `git revert`，所以動手前確認狀態比較省事。

### 歸檔後要補 Purpose

`spectra archive` 建立新的主 spec 時，`## Purpose` 會留下佔位字串：

```
TBD - created by archiving change '<name>'. Update Purpose after archive.
```

這是工具明示要人工補寫的，歸檔後請一併處理，不要讓 TBD 留在正式規格裡。

### 指令使用備註

- `spectra validate` 吃 `--all`，但 **`analyze` 與 `drift` 不吃**，必須逐一指定 change 名稱，否則會回 `Error: Multiple changes found`。要一次掃全部可以用：

  ```powershell
  Get-ChildItem openspec\changes -Directory |
    Where-Object Name -ne 'archive' |
    ForEach-Object { Write-Host "`n=== $($_.Name) ==="; spectra analyze $_.Name; spectra drift $_.Name }
  ```

- 參數形式不一致，容易踩到：`status` 與 `instructions` 用 `--change <name>`，`analyze`／`drift`／`validate`／`archive` 用位置參數 `<name>`。寫錯會回 `error: unexpected argument`。

| 指令                   | 形式                            |
| ---------------------- | ------------------------------- |
| `spectra status`       | `--change <name>`               |
| `spectra instructions` | `<artifact-id> --change <name>` |
| `spectra analyze`      | `<name>`                        |
| `spectra drift`        | `<name>`                        |
| `spectra validate`     | `<name>` 或 `--all`             |
| `spectra archive`      | `<name>`                        |

- `tools:` 目前只填 `claude`。實測填 `codex` / `gemini` 會被無聲忽略（`spectra update` 只回報 claude，也沒產生 `AGENTS.md` / `GEMINI.md`）。

### spec 檔語言（已定案，勿逕自更動）

**spec 採繁體中文描述 + 英文規範關鍵字**（`SHALL` / `SHALL NOT`，以及 `Requirement` / `Scenario` / `WHEN` / `THEN` 等結構關鍵字）。

`spectra-propose` 與 `spectra-ingest` 的 SKILL.md 寫著「spec 必須用英文，因為它使用規範性語言」。本專案**明知該建議而選擇維持繁中**，理由完整記錄在 `openspec/config.yaml` 的 context，摘要：規則要保護的規範關鍵字本來就是英文；`validate --strict` 對 14 個中文 spec 全過；而且 analyze 的 coverage 配對是拿 Requirement 標題比對 tasks.md 的中文文字，spec 改英文會讓配對結構性失效。

看到那條例外條款時，不要「修正」既有 spec。

### Requirement 與 tasks 的配對規則（已實測）

analyze 的 coverage 檢查要求**任務描述裡逐字包含 Requirement 的完整標題**。寫法：

```markdown
- [x] 1.5 對齊 Requirement「非破壞編輯，另存為新素材」：另存為新素材提示，不覆寫原圖
```

只有部分詞語重疊不算 —— 原本寫「非破壞編輯提示：另存為新素材，不覆寫原圖」就配不上，因為「提示：」把標題字串切斷了。2026-08-20 在 `sync-mv-09-design` 實測：4 個 Requirement 從全部 no matching task 變成 Coverage Clean。

### 已知待處理

最新的分級待辦清單在 `SPECTRA-AUDIT-20260820.md`（取代已過期的 `SPECTRA-CHANGE-CHECKLIST.md`）。目前最需要注意的是 `openspec/specs/` 尚不存在 —— 兩個已歸檔的 change 當初沒有 delta spec，正式規格基線是空的，所有能力規格只存在於各 active change 的 `specs/<capability>/spec.md`。

另有 52 個「Requirement has no matching task」散在其餘 10 個 change，用上面的逐字引用寫法即可機械式消除。

## 環境備註

透過 Claude 桌面版掛載這個資料夾操作時，掛載點不允許刪檔，git 會留下清不掉的 `.git/*.lock`。若 git 報 `index.lock: File exists` 且確認沒有 git 行程在跑，把該檔改名移開即可（本機則可直接刪除）。
