# Proposal：AI 試穿左側設定面板在高度不足時加上內部捲動（Y 軸）

## 為什麼

使用者回報「AI 試穿衣服的功能左半邊在高度不夠時候產生破圖，請替他加上 y 軸」。

追查 `TryOnView.vue` 版面結構後確認根因與先前 `GenerateVideoView.vue`（`sync-mv-04-design` 2026-08-21 決策）、`GenerateImageView.vue`（`fix-mv02-genimg-advanced-scroll`）修正過的是同一類問題：

- `.tryon` 只有在 `≥ 80.0625rem`（1281px，本檔案既有的自訂寬度斷點，讓右側結果框跟外層一起等比例縮放）寬度時才會透過 `height: 100%` 往上接到 `DefaultLayout.vue` 的 `.content { overflow-y: auto }`，取得一個「確定高度」的容器。
- 但 `.tryon__input`（左側設定面板）拿到這個確定高度後，內部的 `.step`／已上傳模特清單／同意勾選等內容完全沒有 `overflow` 規則。當視窗高度不足（例如筆電或未最大化視窗）、或使用者切到「上傳模特照」分頁疊加多筆已上傳項目時，內容會直接溢出容器邊界，而不是被裁切或捲動，畫面上呈現內容互相疊壓、圖示與文字錯位的「破圖」現象。
- 這只在寬螢幕（≥1281px）成立，因為窄螢幕下 `.tryon` 沒有 `height:100%` 限制，會隨頁面自然往下長、由 `DefaultLayout.vue` 的 `.content` 整頁捲動，不會出現這個問題——這與使用者反映「高度不夠時候」而非「寬度不夠時候」一致。

## 做了什麼

- `src/views/TryOnView.vue`
  - 版面結構比照 `GenerateVideoView.vue`／`GenerateImageView.vue` 已驗證過的兩段式結構：`.tryon__input` 內拆成 `.tryon__scroll > .tryon__steps`（捲動區，`≥80.0625rem` 時 `flex:1; overflow-y:auto`）＋ `.tryon__fade`（捲動區底部漸層遮罩，放在捲動容器之外）＋ `.tryon__sticky`（固定高的 footer，含錯誤訊息與生成按鈕，`flex-shrink:0`）
  - 沿用本檔案既有的 `@media (min-width: 80.0625rem)` 斷點（而非其他頁面用的 `$bp-lg`），在同一個既有的媒體查詢區塊內補上 `.tryon__input { height:100%; padding:0 }` 與 `.tryon__steps { height:100%; overflow-y:auto; padding: 1.5rem 1.5rem 0.75rem }`，讓左側面板內容過高時只在面板內部（Y 軸）捲動，不再溢出破圖
  - `.tryon__footer` 移除原本的負 margin／border-top（改移到新增的 `.tryon__sticky`），窄螢幕下維持原本自然流動的版面
- `openspec/specs/tryon-ui/spec.md`：新增「左側設定面板在高度不足時面板內部捲動」Requirement 與 Scenario、trace

## 影響範圍

只影響 AI 試穿頁面（`TryOnView.vue`）左側設定面板在寬螢幕（≥1281px）且視窗高度不足時的捲動行為；窄螢幕（<1281px）與其餘頁面不受影響。不影響生成邏輯、肖像同意流程或右側結果面板既有的等比例縮放行為。
