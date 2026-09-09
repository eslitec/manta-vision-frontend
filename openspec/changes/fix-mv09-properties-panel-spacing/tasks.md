## 1. 核對與修正

- [x] 1.1 用 Figma MCP 取得 `1157:619`（文字屬性面板）的精確節點資料，確認內距與分隔線落差屬實
- [x] 1.2 `.properties` 補上 `padding` 與 `border-top`（commit `5431fc4`）
- [x] 1.3 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤

## 2. Ingest

- [x] 2.1 `openspec/specs/image-editor-ui/spec.md`：「字型選單的九個字體家族與 Figma list_font 逐項一致」Requirement 補上面板內距／分隔線描述與 trace

## 3. 補正內距與標題間距（ingest，2026-09-08）

> commit `5431fc4` 的 `padding: 0 1rem 1rem` 其實還是漏了上方 16px（跟 spec 已經寫的「SHALL 有 16px 內距」不符），標題與輸入框之間也還沒有 10px margin。commit `b16ede0` 修正這兩處。

- [x] 3.1 對齊 Requirement「字型選單的九個字體家族與 Figma list_font 逐項一致」（commit `b16ede0`）：`.properties` 的 `padding` 從 `0 1rem 1rem` 改成 `1rem`，補齊上方 16px 內距；新增 `.properties h3` 覆寫（13px Bold、正常行高、`margin: 0 0 0.625rem` 讓標題與輸入框間隔 10px），不再繼承 `.layers h3` 的 15px/1.375rem 行高
- [x] 3.2 `openspec/specs/image-editor-ui/spec.md`：「文字屬性面板有內距與上方分隔線」Scenario 補上標題到輸入框 10px 間距的描述，trace 日期更新
- [x] 3.3 `npx vue-tsc --noEmit` 與 `npx eslint` 確認無錯誤
- [ ] 3.4 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-mv09-properties-panel-spacing`
