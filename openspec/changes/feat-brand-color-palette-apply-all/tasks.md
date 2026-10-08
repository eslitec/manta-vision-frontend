## 1. 實作

- [x] 1.1 對齊 Requirement「視覺識別可上傳 Logo 並管理色票」（commit `1ccb293`）：`BrandSettingsView.vue` 新增 `MAX_COLORS = 10` 常數與 `nextColorLabel(index)`（前 3 筆回傳固定角色標籤，第 4 筆以後回傳「點綴色{n}」）
- [x] 1.2 `applyAllColors()` 改成 `detectedPalette.value.slice(0, MAX_COLORS)`（不再是 `slice(0, colorLabels.value.length)` 只取前 3 色），套用 `nextColorLabel()` 命名
- [x] 1.3 `addColor()` 加上上限判斷（`current.colors.length >= MAX_COLORS` 時不新增），套用 `nextColorLabel()` 命名；`swatch--add` 按鈕只在未達上限時顯示（`v-if="profile.colors.length < MAX_COLORS"`）
- [x] 1.4 色票區塊第 4 個以後（`i >= colorLabels.length`）改成可編輯輸入框（`.swatch__nameInput`，`v-model="c.label"`），前 3 筆維持固定文字顯示
- [x] 1.5 色票標籤旁新增「{目前筆數} / {MAX_COLORS}」計數提示
- [x] 1.6 `src/lang/zh-Hant.ts`／`en.ts` 新增 `brandSettings.color.extra`（「點綴色{n}」／「Accent {n}」）與 `customName`（自訂顏色名稱輸入框的 aria-label），兩語系同步

## 2. 驗證

- [x] 2.1 瀏覽器手動驗證：上傳一張顏色豐富（5 種以上偵測色）的 Logo，點擊「全部套用」，確認全部顏色都加入色票（不只前 3 個），第 4 個以後自動命名為「點綴色2」「點綴色3」；點擊第 4 個色票名稱輸入自訂名稱，確認可以修改；持續新增色票到 10 筆，確認「新增」按鈕消失
- [x] 2.2 `npx vue-tsc --noEmit` 通過
- [x] 2.3 執行 `spectra validate feat-brand-color-palette-apply-all --strict` 與 `spectra analyze feat-brand-color-palette-apply-all`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 2.4 PR 合併並確認畫面驗收無誤後執行 `spectra archive feat-brand-color-palette-apply-all`
