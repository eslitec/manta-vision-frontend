# Proposal：圖生圖「進階設定」對齊設計稿並修正展開時的捲動行為

## 為什麼

使用者針對圖生圖頁面（`GenerateImageView.vue`）的「進階設定」區塊回報兩個問題，並附上 Figma 連結（node `1147:580` scroll_area）：

1. 「進階設定這邊對齊設計稿」——對照 Figma `1147:593`（row_advanced）與 `1147:746`（adv_panel）逐項核對後，發現多處落差：
   - 收合列 `.advanced`：沒有邊框（設計稿是 `1.5px solid #2e3567`）、圓角 8px（設計稿 10px）、高度寫死 1.5rem（設計稿 44px）、文字色用 `$dark-blue-gray`（設計稿 `#2e3567`）、字級 14px 且未加粗（設計稿 13px Medium）
   - 展開面板 `.adv` 內：參考強度列的標籤／數值字級顏色（13px 藍灰 vs 設計稿 12px `#2e3567`）、提示文字字級（12px vs 設計稿 10px）皆偏大
   - 負面提示欄完全沒有字數計數（設計稿 `18 / 200`），欄位是單行 `input` 圓角 8px（設計稿是 56px 高、圓角 18px 的多行欄）
   - 種子欄缺少「隨機」帶入按鈕、「鎖定」按鈕與下方提示文字（設計稿：鎖定同一組種子＋相同設定可重現相近結果）
   - 完全缺少「恢復預設值」列（設計稿 `row_reset`：「恢復預設值」＋「進階設定不影響飼料消耗」提示）
2. 「進階設定展開時應該是 `section.panel.genimg__input` 這邊出現 scrollbar」——目前 `.genimg__input` 沒有任何高度上限，展開進階設定後面板一路撐高，捲動發生在整個頁面而非面板內部。對照 Figma `scroll_area`（`1147:580`）可看出左側面板本來就是固定高度、內容超出時才在面板內部捲動的設計。這與 `GenerateVideoView.vue` 先前（`sync-mv-04-design` 2026-08-21 決策）修正過的同一類問題根因相同：`.panel` 沒有高度上限，`.xxx__sticky` 的 `margin-top: auto` 沒有剩餘空間可推，導致整頁捲動。

## 做了什麼

- `src/views/GenerateImageView.vue`
  - 版面結構比照 `GenerateVideoView.vue` 已驗證過的兩段式結構：`.genimg__input` 內拆成 `.genimg__scroll > .genimg__steps`（捲動區，`flex: 1; overflow-y: auto`）＋ `.genimg__fade`（捲動區底部漸層遮罩，放在捲動容器之外）＋ `.genimg__sticky`（固定高的 footer，含錯誤訊息與生成按鈕，`flex-shrink: 0`），並讓 `.genimg`／`.genimg__input` 在 `≥ $bp-lg` 時取得確定高度（`height: 100%; min-height: 0`），使捲動只發生在 `.genimg__steps` 內
  - `.advanced` 收合列：補上 `1.5px solid $blue-dark-500` 邊框、圓角改 10px、高度改 2.75rem（44px）、內距改左 14px／右 12px、字級改 0.8125rem（13px）＋ font-weight 500、文字與 icon 顏色改 `$blue-dark-500`
  - `.adv__label`／`.adv__val` 字級改 0.75rem（12px）＋ 500、顏色改 `$blue-dark-500`；`.adv__hint` 字級改 0.625rem（10px）
  - 負面提示欄：`input` 改為 `textarea.adv__field.adv__field--negative`（56px 高、圓角 18px、可輸入至 200 字），標籤列補上 `.adv__counter` 即時字數計數
  - 種子欄：標籤列補上「隨機」按鈕（`randomizeSeed()`，帶入 9 位數範例格式亂數）；欄位下方補上 `.adv__lock`「鎖定」切換按鈕（`seedLocked` 狀態，純前端視覺切換，不影響送出邏輯）與 `.adv__hint` 說明文字
  - 新增「恢復預設值」列（`.adv__reset`，`resetAdvanced()` 重置參考強度／負面提示／種子／鎖定狀態為初始值，純本地狀態、不影響飼料消耗）
- `src/lang/zh-Hant.ts`、`src/lang/en.ts`：新增 `image.seedRandom`、`image.seedLock`、`image.seedHint`、`image.resetAdvanced`、`image.resetAdvancedHint` 五組文案（中英對照）
- `openspec/specs/generate-image-ui/spec.md`：「圖生圖頁面呈現對齊設計稿」Requirement 補上進階設定樣式與面板內部捲動兩個 Scenario、trace

## 影響範圍

只影響圖生圖頁面（`GenerateImageView.vue`）本身的「進階設定」樣式與 `.genimg__input` 版面結構；不影響其他頁面。捲動結構調整（`.genimg__scroll`／`.genimg__steps`／`.genimg__sticky`）只在 `≥ $bp-lg` 生效，手機版維持原本單欄自然流動、不強制內部捲動。種子「鎖定」與「恢復預設值」為新增的前端狀態，不影響 `buildReq()` 送出邏輯或飼料扣除。
