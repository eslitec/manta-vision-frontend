# Proposal：圖片挑選彈窗打勾徽章對齊設計稿

## 為什麼

GitHub PR review 留言（@nelsonliu-eslitec）指出 `ImagePickerDialog.vue` 挑選彈窗裡縮圖右上角的打勾徽章「再對齊設計稿」，並附上 Figma 連結（node `1246:2412`，`dlg_grid` 裡的 `thumb`）與兩張截圖：一張是 Figma 端放大截圖（深藍圓底＋白色勾勾），一張是目前專案畫面（同一位置的徽章）。

用 Figma MCP 逐層核對 `1246:2412` 底下的節點：

- `thumb`（1246:2412）本身只包含縮圖 `shell` 與播放圖示，沒有打勾徽章——徽章其實是 `thumb` 的手足節點 `sel_check`（1246:2416，選取時）／`1246:2423`（未選取時）
- `sel_check`（選取）：`bg-[#2e3567]`、`rounded-[11px]`、22×22，內含 `ic_ok` 圖示 13×13——這些數值跟目前 `.pick__check.isOn` 的 CSS（`background: $blue-dark-500`、`border-radius: 11px`、`22px`、icon `13px`）逐項比對後完全一致
- `sel_check`（未選取）：`bg-white border border-[#d2d5dd] opacity-90 rounded-[11px]`——同樣跟目前 `.pick__check` 預設樣式完全一致
- 徽章位置 `top: 6px; right: 6px`（Figma `x:131,y:6`，縮圖寬 159）也跟現有 CSS 完全一致

換句話說，徽章的**尺寸、顏色、圓角、位置全部都已對齊設計稿**，真正的落差在勾勾「圖示本身的造型」：Figma 的 `ic_ok` 是簡潔、對稱、單一粗細、置中的勾勾線條；目前 `IconCheck.vue` 用的是一條不對稱、粗細不均、偏向左下角的手繪曲線路徑（`viewBox 18x18` 的怪異 bezier path），放大比對後明顯跟設計稿的勾勾造型對不上，這正是造成「看起來跟設計稿不一樣」的原因。

## 做了什麼（第一輪）

- `src/components/icons/IconCheck.vue`：把原本不對稱的手繪 path 換成標準的 stroke-based 勾勾（`viewBox 0 0 24 24`，`M5 13l5 5L20 7`，`stroke-width 2.5`、圓端／圓角連接），造型對稱、置中、粗細一致，對齊 Figma `ic_ok` 的視覺比例
- `openspec/specs/library-management-ui/spec.md`：新增「素材挑選彈窗以打勾徽章標示已選取項目」Requirement，記錄徽章與勾勾圖示的完整數值與 Scenario、trace

## 第一輪的誤判與修正（第二輪）

第一輪核對時，`get_design_context` 對 `sel_check`（1246:2416）回傳的是 `bg-[#2e3567]` 圓底搭配一個 `IcOk` 子元件（尺寸 13×13），而单獨查詢 `ic_ok`（194:36）master 元件時看到的是「綠色圓＋白色勾」，因為只看到攤平後的截圖、看不出圖層結構，我誤判成「`sel_check` 情境下 `ic_ok` 的綠色圓底被 instance override 拿掉了，只剩勾勾本身」，因此第一輪只把 `IconCheck.vue` 改成單色的勾勾線條，沒有把綠色圓一起還原。

使用者直接提供了徽章的完整原始 SVG，才發現判斷錯誤——徽章其實是三層疊在一起：

```svg
<rect width="22" height="22" rx="11" fill="#2E3567"/>            <!-- 外圈：深藍實心圓，22x22 整個徽章 -->
<path ... fill="#54C14F"/>                                        <!-- 內圈：綠色同心圓，半徑 5.6875（約外圈一半）-->
<path fill-rule="evenodd" ... fill="white"/>                      <!-- 白色勾勾，疊在綠色圓上 -->
```

也就是說 `ic_ok` 的綠色圓底其實**沒有**被拿掉，`sel_check` 的深藍圓其實是 `ic_ok` 綠色圓外面另外多一圈的深藍色外框；先前只做出「純深藍圓＋白勾」，漏掉了中間那圈綠色。

## 做了什麼（第二輪修正）

- `src/components/icons/IconCheck.vue`：改成完整還原 Figma 原始 SVG 的三層徽章——`viewBox 0 0 22 22`，`rect`（`#2E3567`，22×22 全滿）＋ 同心 `path`（`#54C14F`，半徑 5.6875）＋ 白色勾勾 `path`（`evenodd`），三個顏色直接寫死（不透過 `currentColor`），因為這是固定的多色徽章插圖，不是可換色的單色圖示
- `src/components/ImagePickerDialog.vue`：`.pick__check svg` 尺寸從 `13px` 改成 `100%`（填滿整個 22px 徽章框，因為圖示本身現在就是完整徽章，不再是置中的小勾勾）；`.isOn` 不再疊自己的 `background: $blue-dark-500`（避免跟圖示裡的深藍圓重複），並且把 `border-color: transparent` 改成 `border-width: 0`——因為專案是 `box-sizing: border-box`，留著 1px 透明邊框會讓 svg 的 100% 尺寸少算 2px，圖示會比設計稿的 22px 徽章小一圈

## 影響範圍

`IconCheck` 元件目前只有 `ImagePickerDialog.vue` 的縮圖選取徽章在用，改動只影響這個徽章本身的視覺呈現，不影響徽章的尺寸／位置（原本就已對齊設計稿），也不影響挑選、批次選取等互動邏輯。
