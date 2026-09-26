## 1. 歷史純邏輯

- [x] 1.1 對齊 Requirement「編輯圖片提供上一步／下一步」、依設計決策「歷史以文件 JSON 快照記錄，單一 watch 為唯一記錄點」與「連續輸入以合併 key 在 1 秒內合併」：新增 `src/composables/useEditorHistory.ts`（`reset`／`record`／`undo`／`redo`／`canUndo`／`canRedo`，上限 50 步、合併窗 1 秒、上一步／下一步後不准合併）與 `pickSelection`；`src/composables/useEditorHistory.spec.ts` 13 條（設計的 12 條＋10b）。驗證：`npx vitest run src/composables/useEditorHistory.spec.ts` 13 passed；拿掉 `stack.length = index.value + 1` 後第 5（與第 9）條紅、拿掉合併條件的 `canMerge &&` 後第 9 條紅、拿掉合併後回到上一步就移除的那一行後第 10b 條紅，`cp` 還原後再綠
- [x] 1.2 對齊 Requirement「編輯圖片提供上一步／下一步」、依設計決策「連續輸入以合併 key 在 1 秒內合併」（偏離原設計稿，補一條）：合併後的文件若等於上一步（例：屬性面板打字後 1 秒內在輸入框內原生 ⌘Z），移除這一步——否則會多出一次「按了畫面沒變」的上一步；矩陣第 18 條實際走到這條路徑

## 2. 元件接線

- [x] 2.1 對齊 Requirement「編輯圖片提供上一步／下一步」、依設計決策「歷史以文件 JSON 快照記錄，單一 watch 為唯一記錄點」：`src/components/ImageEditorWorkspace.vue` 在 `cropRect`／`layers`／`editingTextKey` 之後宣告 `docJson`（剔除 `dragging`）、`commitHistory`、`watch([docJson, pointerActive, editingTextKey])`；`window` capture 的 `pointerdown`（只收主鍵）／`pointerup`／`pointercancel`／`dragend` 維護 `pointerActive`；編輯文字時按到文字框以外先 `finishTextEdit`＋`blur`＋記一步；`applyHistoryEntry` 以 `splice` 替換圖層、`Object.assign` 還原裁切框；`undoEdit`／`redoEdit` 在指標按住中或文字編輯中不執行。驗證：`npx vue-tsc --noEmit` exit 0（無 TS2448／TS2454）
- [x] 2.2 對齊 Requirement「編輯圖片提供上一步／下一步」、依設計決策「換底圖清空歷史，另存不清歷史」：`selectEditorAsset` 的底圖分支最後 `editorHistory.reset(docJson.value, 'original')`；另存流程不碰歷史；扣款相關狀態（`usedTools`／`pricing`／`applyingTool`）不在快照內（以程式碼確認：`docJson` 只序列化 `layers`、`cropRect`、`ratio`）
- [x] 2.3 對齊 Requirement「編輯圖片提供上一步／下一步」、依設計決策「連續輸入以合併 key 在 1 秒內合併」：屬性面板文字 input 與顏色 input 加 `@input.capture` 設合併 key（不可用 `@input`：v-model 的 listener 先跑、watch 先記完）；物件與文字縮放把手方向鍵改成先算新值、有變才設 `scale:` key；document capture `keydown` 清空合併 key
- [x] 2.4 對齊 Requirement「編輯圖片提供上一步／下一步」、依設計決策「復原後的選取與工具」：還原後以 `pickSelection` 決定選取、關閉字型選單；還原的裁切框或比例有變且不在裁切工具時自動切到裁切工具
- [x] 2.5 對齊 Requirement「編輯圖片提供上一步／下一步」（右鍵不卡閘門）：`startCropResize` 補 `event.button !== 0` 守衛（它是唯一沒檢查的拖曳起點）

## 3. 圖層操作

- [x] 3.1 對齊 Requirement「圖層可複製、剪下、貼上、原地複製與刪除」、依設計決策「圖層剪貼簿為元件內部變數」：新增 `insertLayerCopy`（「+」、⌘D、⌘V 共用）、`copySelectedLayer`（剪下＝放入後刪除，剪下後第一次貼上不錯開）、`pasteLayer`（錯開 3%，連續貼上逐次再錯開）、`deleteSelectedLayer`（選取移到相鄰圖層）、`nudgeLayer`（值有變才設 `nudge:` 合併 key）；`duplicateSelectedLayer` 改呼叫 `insertLayerCopy`，行為不變
- [x] 3.2 對齊 Requirement「圖層可複製、剪下、貼上、原地複製與刪除」、依設計決策「快捷鍵守衛交給原生的情境」：畫布文字 `contenteditable` 由 `'true'` 改 `'plaintext-only'`

## 4. 快捷鍵

- [x] 4.1 對齊 Requirement「編輯圖片的鍵盤快捷鍵」、依設計決策「快捷鍵守衛交給原生的情境」：`onEditorKeydown` 掛 `document` 的 `keydown`（bubble，`useEventListener` 卸載自動移除）；鍵值正規化（大寫 Z、非拉丁配置退回 `code`）；守衛依序為 AI 修圖頁、未選底圖、`defaultPrevented`、`isComposing`、`#app` inert、文字輸入焦點（排除 checkbox／radio／color／range／button／submit／reset／file）、指標按住中或文字編輯中（⌘Z／⌘Y 仍 `preventDefault`）、⌘ 搭配 Alt、非 ⌘ 鍵且字型選單或一覽開著；⌘⇧C／⌘⇧D 不搶；⌘D 一律 `preventDefault`；⌘C 只在畫布以外有反白時讓給原生

## 5. 提示 UI 與 i18n

- [x] 5.1 對齊 Requirement「快捷鍵提示」、依設計決策「工具列 ‹ › 改為上一步／下一步，縮放改「− 80% +」」：`.canvasActions` 改為上一步／下一步（`IconBack`／`IconNext`，依 `canUndo`／`canRedo` 停用，`title`／`aria-label`／`aria-keyshortcuts`）＋分隔線＋「− 80% +」；`.canvasActions__zoom` 改名 `.canvasActions__btn`（`grep -c canvasActions__zoom` 為 0）。對齊 Figma `566:4983`／`566:4986`
- [x] 5.2 對齊 Requirement「快捷鍵提示」、依設計決策「提示採常駐入口，不做一次性提示」：圖層面板標題列「+」加含 ⌘D 的 `title`，新增垃圾桶按鈕 `.layers__delete`（`IconDelete`，與「+」同樣依 `canDuplicateSelectedLayer` 停用）；`footer.canvasFoot` 加 `.shortcutHelp`（常駐 `output` 提示、disclosure 按鈕、9 列一覽，`useDismissableMenu` 點外面／Esc 關），⌘C／⌘X 後 2 秒提示（`output` 常駐、空白時不以 `display: none` 隱藏，否則 live region 不在無障礙樹、讀屏不播報），計時器在 `onBeforeUnmount` 清掉
- [x] 5.3 對齊 Requirement「快捷鍵提示」：`src/lang/zh-Hant.ts`／`src/lang/en.ts` 的 `editor` 下同步新增 `undo`、`redo`、`deleteLayer`、`withShortcut`、`shortcuts.*`（17 個 key）。驗證：兩語系 key 差異與基準 `b733343` 相同（zh-Hant 多 8 個既有 `editor.retouch.*`、en 多 0；總數 714／706 對基準 697／689）

## 6. 驗證

- [x] 6.1 `npx vitest run` 269 passed（基準 256＋13）；`npx vue-tsc --noEmit` exit 0；`npm run lint` exit 0；`npx prettier --check` 改動檔全過
- [x] 6.2 對齊 Requirement「編輯圖片提供上一步／下一步」、Requirement「編輯圖片的鍵盤快捷鍵」、Requirement「圖層可複製、剪下、貼上、原地複製與刪除」、Requirement「快捷鍵提示」：mock 真瀏覽器矩陣（puppeteer-core 無頭 Chrome、`page.keyboard`／`page.mouse` 真事件，腳本在 scratchpad `history/matrix/matrix.cjs`）design §6 第 1–39 條＋補充第 40 條（勾選框有焦點時 ⌘Z 仍作用）、第 41 條（⌘Y／Ctrl+Y 下一步、⌘⌥Z 不作用、`isComposing` 的 Delete 不作用且以不帶 `isComposing` 的同一事件為對照、文字輸入框內 ⌘C 為原生複製）、第 42 條（拖曳裁切框、拖曳裁切角把手各為一步）共 42 條全部 PASS；console error 只有既有的 `/favicon.ico` 404（基準版本同樣出現）
- [x] 6.3 先讓它紅：基準 `b733343`（非 git 複本）跑第 1、3 條 FAIL、第 18 條 PASS；實作後第 9 條（`@input.capture` 改回 `@input` → 第一次 ⌘Z 只退到「輸入文字ab」）、第 37 條（拿掉 pointerdown 裡的結束編輯）、第 38 條（拿掉「畫布以外」的包含判斷 → 提示不出現、貼上沒有 +1）各自改壞後 FAIL，`cp` 還原後 PASS。偏離：design §6 第 38 條指定的改壞方式（判斷改回 `getSelection().toString()===''`）在本專案量不出差異——未編輯的文字圖層是 `user-select: none`，殘留反白 `toString()` 本來就是空字串（實測 `collapsed:false`、錨點在畫布內、`text:''`），故改用拿掉包含判斷
- [x] 6.4 真後端子集（worktree 以 vite :5199 proxy 到 :8000，新註冊 `e2e_hist_0927_*` 帳號、`POST /upload` 上傳底圖）第 1、3、10、20、24、36 條 PASS；非 GET 請求只有 `POST /auth/login` 與第 20 條的 `POST /upload`，沒有任何扣飼料端點。偏離：R2 的 CORS 只允許 `http://localhost:5173`，從 :5199 另存會被擋（與本 change 無關的環境限制），第 20 條以 `--disable-web-security` 重跑 PASS
- [x] 6.5 對齊 Requirement「編輯圖片提供上一步／下一步」（扣款紀錄不被上一步回滾）：依任務限制不點「背景移除」，此 Scenario 以程式碼確認（快照不含 `usedTools`，`applyHistoryEntry` 只寫 `layers`／`cropRect`／`ratio`／選取／字型選單／工具），未做瀏覽器實測
- [ ] 6.6 PR 合併並確認畫面驗收無誤後執行 `spectra archive editor-history-shortcuts`
