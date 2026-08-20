# CLAUDE.md

給 Claude（或其他 AI 協作工具）在這個 repo 工作時的指引。

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

## OpenSpec

`openspec/` 底下是變更提案與規格文件，`.claude/skills/openspec-*` 提供對應流程（propose / apply / update / archive / sync-specs）。做較大的功能改動時走這套流程；小修不必。

## 環境備註

透過 Claude 桌面版掛載這個資料夾操作時，掛載點不允許刪檔，git 會留下清不掉的 `.git/*.lock`。若 git 報 `index.lock: File exists` 且確認沒有 git 行程在跑，把該檔改名移開即可（本機則可直接刪除）。
