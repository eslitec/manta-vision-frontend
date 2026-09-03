# Proposal：圖片挑選彈窗打勾徽章對齊設計稿

## 為什麼

GitHub PR review 留言（@nelsonliu-eslitec）指出 `ImagePickerDialog.vue` 挑選彈窗裡縮圖右上角的打勾徽章「再對齊設計稿」，並附上 Figma 連結（node `1246:2412`，`dlg_grid` 裡的 `thumb`）與兩張截圖：一張是 Figma 端放大截圖（深藍圓底＋白色勾勾），一張是目前專案畫面（同一位置的徽章）。

用 Figma MCP 逐層核對 `1246:2412` 底下的節點：

- `thumb`（1246:2412）本身只包含縮圖 `shell` 與播放圖示，沒有打勾徽章——徽章其實是 `thumb` 的手足節點 `sel_check`（1246:2416，選取時）／`1246:2423`（未選取時）
- `sel_check`（選取）：`bg-[#2e3567]`、`rounded-[11px]`、22×22，內含 `ic_ok` 圖示 13×13——這些數值跟目前 `.pick__check.isOn` 的 CSS（`background: $blue-dark-500`、`border-radius: 11px`、`22px`、icon `13px`）逐項比對後完全一致
- `sel_check`（未選取）：`bg-white border border-[#d2d5dd] opacity-90 rounded-[11px]`——同樣跟目前 `.pick__check` 預設樣式完全一致
- 徽章位置 `top: 6px; right: 6px`（Figma `x:131,y:6`，縮圖寬 159）也跟現有 CSS 完全一致

換句話說，徽章的**尺寸、顏色、圓角、位置全部都已對齊設計稿**，真正的落差在勾勾「圖示本身的造型」：Figma 的 `ic_ok` 是簡潔、對稱、單一粗細、置中的勾勾線條；目前 `IconCheck.vue` 用的是一條不對稱、粗細不均、偏向左下角的手繪曲線路徑（`viewBox 18x18` 的怪異 bezier path），放大比對後明顯跟設計稿的勾勾造型對不上，這正是造成「看起來跟設計稿不一樣」的原因。

## 做了什麼

- `src/components/icons/IconCheck.vue`：把原本不對稱的手繪 path 換成標準的 stroke-based 勾勾（`viewBox 0 0 24 24`，`M5 13l5 5L20 7`，`stroke-width 2.5`、圓端／圓角連接），造型對稱、置中、粗細一致，對齊 Figma `ic_ok` 的視覺比例
- `openspec/specs/library-management-ui/spec.md`：新增「素材挑選彈窗以打勾徽章標示已選取項目」Requirement，記錄徽章與勾勾圖示的完整數值與 Scenario、trace

## 影響範圍

`IconCheck` 元件目前只有 `ImagePickerDialog.vue` 的縮圖選取徽章在用，改動只影響這個勾勾圖示本身的造型，不影響徽章的尺寸／顏色／位置（這些原本就已對齊設計稿），也不影響挑選、批次選取等互動邏輯。
