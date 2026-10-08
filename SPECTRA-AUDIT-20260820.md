# Spectra 全專案健檢

日期：2026-08-20（同日稍晚更新處理結果）
分支：`codex/mv00-05-review-followup`
初版基準：commit `952058d`；本次更新基準：commit `4b74caf`
前次健檢：`SPECTRA-CHANGE-CHECKLIST.md`（2026-08-10，已過期，由本文取代）

## 一句話結論

Spectra 的工具面與流程面都已收斂：`spectra analyze` 對 **14 個 change 全部 Coverage / Consistency / Gaps 皆 Clean，零 CRITICAL、零 WARNING**，只剩 68 個 SUGGEST（Scenario 缺 `##### Example:`，已決定暫不處理）。仍未解的結構性問題只剩一個：**正式規格基線 `openspec/specs/` 尚不存在**。

## 本日處理結果

| 項目                           | 初版狀態                                     | 現況                                              |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------- |
| CRITICAL                       | 2（mv-01、mv-02 的 capability 誤判）         | **0** — commit `1123ddd`                          |
| WARNING                        | 59（56 Requirement 未配對 + 3 Design topic） | **0** — commit `4b74caf`                          |
| SUGGEST                        | 67                                           | 68（mv-09 ingest 新增 1 個 Scenario）— 決定不處理 |
| 壞掉的 anchor                  | 2 / 247                                      | 1（mv-00 `--wide`，確認為誤判，保留）             |
| 換行符 CRLF 汙染               | 23 個假 diff 檔                              | **已解** — commit `34ee8f1` 加入 `.gitattributes` |
| `spectra update` 產物          | 未提交                                       | 已提交 `952058d`                                  |
| 新舊技能並存                   | openspec-\* 6 個 + opsx 3 個                 | **已移除** — commit `e51dfb8`                     |
| `openspec/config.yaml` context | 全部註解                                     | **已補** — commit `eb60109`、`d8c5421`            |
| `README.md`                    | UTF-16 亂碼                                  | **已重寫** — commit `e51dfb8`                     |
| spec 檔語言                    | 未定案                                       | **定案維持繁中** — commit `d8c5421`               |
| mv-09 字型選單改動             | 未 ingest                                    | **已 ingest** — commit `07d8296`                  |

### 兩個實測確認的機制

1. **Coverage 配對**：任務描述必須**逐字包含 Requirement 的完整標題**。部分詞語重疊不算 —— 標題「非破壞編輯，另存為新素材」對上原任務「非破壞編輯提示：另存為新素材，不覆寫原圖」配不上，因為「提示：」把字串切斷。統一寫法：`對齊 Requirement「<標題原文>」：<原描述>`。
2. **`tools:` 只接受 `claude`**：填 `codex` / `gemini` 時 `spectra update` 只回報 `Updated instruction files for: claude`，無錯誤也不產生 `AGENTS.md` / `GEMINI.md`。

---

## P0 — 會讓 Spectra 判斷失準

### 1. `openspec/specs/` 根本不存在，正式規格基線是空的

Spectra 產生的 CLAUDE.md 受管區塊寫著「Specs live in `openspec/specs/`」，但這個目錄不存在。

已歸檔的兩個 change（`2026-08-04-remove-i18n`、`2026-08-07-centralize-button-components`）目錄裡只有 `proposal.md` / `design.md` / `tasks.md`，**沒有 `specs/` 子目錄**，所以 archive 時沒有 delta spec 可以合併進正式規格。

後果：所有能力（capability）的規格只存在於 14 個 active change 各自的 `specs/<capability>/spec.md`。`/spectra-ask` 的 RAG 檢索、`spectra analyze` 的 capability 引用檢查都少了正式基線可以對照。

建議：先確認這兩個舊 change 是否本來就沒有 delta spec（可能是早期還沒建立習慣）。之後每個 change 歸檔前務必確認 `specs/` 有內容。

### 2. ~~換行符全面 CRLF 汙染~~（已解，commit `34ee8f1`）

`git status` 顯示 28 個檔案、約 2,685 行新增 / 2,862 行刪除，看起來像一大批未提交的工作。實際上：

```
git diff --ignore-cr-at-eol --stat   →  只有 5 個檔案有真實變更
```

真正有內容變動的只有 `BACKEND.md`（+363）、`CLAUDE.md`（+29，Spectra 受管區塊）、以及 `spectra update` 刪掉的 3 個 opsx 指令檔。**`src/**` 底下沒有任何真實的未提交變更** — 全部是 LF → CRLF 的換行差異。

成因：專案沒有 `.gitattributes`，`core.autocrlf` 也沒設定。檔案當初以 LF 提交，後來被某個 Windows 工具整批改寫成 CRLF。

後果：

- `spectra drift` 比對程式檔案與 anchor 時會被大量假差異淹沒
- 任何 code review / PR diff 都不可讀
- 每次 `git add -A` 都會誤把整批換行改動一起提交

建議修法：

```
# .gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.svg text eol=lf
```

加完後執行 `git add --renormalize .` 做一次性正規化，單獨提交。

### 3. ~~`README.md` 是 UTF-16 LE 亂碼~~（已重寫，commit `e51dfb8`）

內容是 `node-js-week1-2026`，跟這個專案無關，且編碼是 UTF-16 LE + CRLF，在多數工具裡顯示為亂碼。建議重寫成正常的 UTF-8 專案說明。

---

## P1 — 流程一致性

### 4. ~~新舊兩套技能並存~~（已移除，commit `e51dfb8`）

| 位置                        | 內容                                                                                                            | 狀態           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------- |
| `.claude/skills/spectra-*`  | 13 個（analyze / apply / archive / ask / audit / commit / debug / discuss / drift / ingest / propose / verify） | 新，今天產生   |
| `.claude/skills/openspec-*` | 6 個（apply-change / archive-change / explore / propose / sync-specs / update-change）                          | 舊，2026-08-01 |
| `.claude/commands/spectra/` | 11 個                                                                                                           | 新             |
| `.claude/commands/opsx/`    | 剩 explore / sync / update（apply、archive、propose 已被 `spectra update` 刪除）                                | 殘留           |

`spectra update` 只刪掉了三個同名被取代的 opsx 指令，其餘沒動。建議確認 `openspec-*` 與剩下的 `opsx/*` 是否還要保留；若不保留就整批移除，避免同一件事有兩套指示。

### 5. ~~`openspec/config.yaml` 的專案上下文完全是空的~~（已補上，commit `eb60109`／`d8c5421`）

`context`、`rules`、`operations` 三段全是註解範例，等於每次 `/spectra-propose` 產生 artifact 時，Spectra 拿不到技術棧、指令、慣例。

建議至少補上：

```yaml
context: |
  Vue 3 + TypeScript + Vite；SFC template 使用 Pug，樣式寫在 SFC 內
  狀態管理 Pinia，多語系 vue-i18n（en / zh-Hant 兩份必須同步）
  指令：npm run build（vue-tsc --noEmit + vite build）、npm run lint、npm test（Vitest）
  設計依據：Figma MantaGO draft（fileKey ysYFocN2TtBSeJHdGS5d7R）
  樣式單位：字體／尺寸／間距用 rem；border、radius、shadow、breakpoint 用 px
  commit 遵循 Conventional Commits，訊息寫繁體中文
```

這是前次 checklist 的 P2，但它實際影響每一次 propose 的產出品質，建議提前處理。

### 6. ~~codex / gemini 的指令檔沒有產生~~（已確認不支援，`tools` 收斂為 claude，commit `eb60109`）

`.spectra.yaml` 已列 `tools: [claude, codex, gemini]`，但執行 `spectra update` 後專案根目錄沒有出現 `AGENTS.md`、`GEMINI.md`，也沒有 `.codex/`、`.gemini/`。

可能原因：這兩個識別字不被目前版本接受（設定檔原本的註解範例只列 `claude` 和 `cursor`），或需要另外的產生機制。**請確認 `spectra update` 當時的輸出訊息有沒有提到跳過或不認得。** 若不支援就把它們從 `tools` 移除，避免誤以為 Codex 那邊也吃得到 Spectra 流程。

### 7. 14 個 active change 幾乎全部完成，卻沒有一個歸檔

| change                                    | 任務      | started marker | delta spec                 |
| ----------------------------------------- | --------- | -------------- | -------------------------- |
| `allow-edited-assets-as-generation-input` | 5/5       | 無             | generation-input-assets    |
| `restore-project-i18n`                    | 10/10     | 無             | ui-localization            |
| `standardize-frontend-style-conventions`  | 5/5       | 無             | frontend-style-conventions |
| `sync-components-buttons`                 | 13/13     | 有             | shared-button-components   |
| `sync-mv-00-design`                       | 59/59     | 有             | home-workbench-ui          |
| `sync-mv-01-design`                       | 35/35     | 有             | library-management-ui      |
| `sync-mv-02-design`                       | 11/11     | 有             | generate-image-ui          |
| `sync-mv-03-design`                       | 16/16     | 有             | marketing-post-ui          |
| `sync-mv-04-design`                       | **26/27** | 有             | generate-video-ui          |
| `sync-mv-05-design`                       | 12/12     | 有             | tryon-ui                   |
| `sync-mv-06-design`                       | 7/7       | 有             | usage-stats-ui             |
| `sync-mv-07-design`                       | 7/7       | 有             | ai-metrics-ui              |
| `sync-mv-08-design`                       | **9/10**  | 有             | brand-settings-ui          |
| `sync-mv-09-design`                       | **13/14** | 有             | image-editor-ui            |

前三個 100% 完成又沒有 started marker，是最適合先歸檔的候選 — 但依照既有慣例要等 PR 合併後才 archive。

前次 checklist 說「MV-06～09 為 0% 卻有 started marker、建議 Park」— 這項已經過時，它們現在都接近或已達 100%。

---

## P2 — 內容待辦

### 8. 三個未完成任務

- `sync-mv-04-design` 10.4：以 1366×940 比對 MV-04 主框，確認移除品牌設定後的間距、警示列與底部操作對齊設計稿
- `sync-mv-08-design` 3.2：若需新欄位，擴充 `BrandProfile` 型別與 mock
- `sync-mv-09-design` 4.1：擴充 `api.editImage`／扣款（`stores/feed`）與另存（`useAssets`）

### 9. ~~今天的字型選單改動尚未 ingest~~（已完成，commit `07d8296`）

`8af74a7`、`eb78827`、`bde016b` 三個 commit 把編輯器字型選單從原生 `<select>` 改成自訂 listbox，並與 Figma `dropdown_font`（node `1157:871`）對齊。這批改動還沒回補進 `sync-mv-09-design` 的 design / spec / tasks。

### 10. `SPECTRA-CHANGE-CHECKLIST.md` 已過期

日期 2026-08-10、基準 commit `69e2f23`、分支 `feature/mv-00-05-consolidated` 都不是現況（目前在 `codex/mv00-05-review-followup`）。裡面 P0 的六個項目狀態需要重新確認。建議這份文件由本報告取代，或更新後保留一份就好。

### 11. 未被 gitignore 的編輯器暫存檔（已 gitignore，實體檔案待人工刪除）

三個 `.fuse_hidden*`（`src/components/` 一個、`src/lang/` 兩個）以未追蹤狀態留在 repo 裡。建議刪除並在 `.gitignore` 加入 `.fuse_hidden*`。

根目錄另有 7 個 `vite.config.ts.timestamp-*.mjs`，`.gitignore` 第 39 行已涵蓋，只是佔磁碟空間，可一併清掉。

### 12. ~~`CLAUDE.md` 的「已知待處理」段落已過時~~（已改寫，commit `d8c5421`）

裡面寫的兩項（`tools` / `claude_slash_commands` 是註解、`locale` 是 en）今天都已處理，該段需要改寫。

---

## 我這邊跑不到、需要你在本機執行的

Spectra CLI 裝在 Windows 主機，我的掛載環境叫不到它。以下四個指令的輸出才是這份健檢的權威版本：

```
spectra list
spectra validate --all --strict
spectra analyze
spectra drift
```

建議先做完 P0-2（換行正規化）再跑 `spectra drift`，否則結果會被假差異淹沒。

---

## 建議處理順序（更新後尚未完成的項目）

1. 決定 `openspec/specs/` 要補建還是等下批 archive 自然生成（P0-1，唯一剩下的結構性問題）
2. 收掉三個未完成任務：mv-04 的 10.4、mv-08 的 3.2、mv-09 的 4.1 與 4.3
3. 決定 14 個 change 的歸檔時機（`allow-edited-assets`、`restore-project-i18n`、
   `standardize-frontend-style-conventions` 三個 100% 完成又無 started marker，最適合先收）
4. 決定是否回頭補 68 個 `##### Example:`（不擋 validate / apply，非急迫）
5. 人工刪除 `_to_delete/`、3 個 `.fuse_hidden*`、7 個 `vite.config.ts.timestamp-*.mjs`
6. `SPECTRA-CHANGE-CHECKLIST.md` 已由本文取代，決定刪除或保留
