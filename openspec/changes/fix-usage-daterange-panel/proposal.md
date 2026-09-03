# Proposal：用量統計「自訂區間」改用 Figma 雙月曆面板

## 為什麼

使用者貼上 Figma 完整節點 `1151:862`（`panel_calendar`，MantaGO draft 檔案）的 SVG／連結，要求「請修改的跟 figma 相同」。這個節點是一個完整的雙月曆日期區間挑選面板：開始／結束日期顯示框、左右並排兩個月曆（含上下月導覽、星期標頭、日期格子的起訖／區間內樣式）、四個快速選取 chip（過去 7 天／上個月／本季／今年至今），以及提示文字＋取消／套用按鈕。

目前 `UsageView.vue` 的「自訂」區間只是兩顆裸的 `<input type="date">` 加一個「套用」按鈕，跟設計稿的落差是整個面板都還沒做，不是單純調色或間距的問題，所以這次是新建元件，不是小修。

用 Figma MCP（`get_design_context` + 對照既有 `_variables.scss`／`AppButton.vue`）逐一核對面板每個區塊的數值：

- 外層面板：白底、`#d2d5dd` 1px 邊框、圓角 12px、陰影 `0 8px 12px rgba(0,0,0,.16)`，`padding: 16px 16px 14px`，flex-col gap 12px
- `row_inputs`：開始／結束兩個顯示框各 flex-1，label 11px `#b4b9c4`，框 `border-radius: 8px`、`padding: 8px 10px`、文字 13px `#2e3567`；開始框邊框 `#2e3567`（強調），結束框邊框 `#d2d5dd`
- `row_months`：兩個月曆並排，gap 20px，各月曆寬 238px；月曆標頭（`mh`）用 `ic_back`／`ic_next`（14×14，`currentColor`）＋置中月份標籤（13px bold `#2e3567`）；星期列每格 34×22px，文字 11px `#b4b9c4`；日期格每格 34×32px——起訖日（`d8`／`d31`）是 `#2e3567` 底、白色粗體字、8px 圓角；區間內的日期是 `#eff2fa`（`$blue-light`）底、`#2e3567` 字、**沒有圓角**（讓相鄰格子的底色連成一條）
- `row_quick`：四個 chip，白底、`#d2d5dd` 1px 邊框、圓角 18px、`padding: 6px 12px`、文字 14px `#383c4b`
- `row_act`：提示文字 11px `#b4b9c4`（「最長可選 365 天」）＋取消／套用按鈕——量了兩顆按鈕的 `padding: 9px 16px`、圓角 18px、陰影 `0px 4px 2px rgba(0,0,0,.25)`，發現這剛好精確對應專案既有 `AppButton` 元件的 `outline`／`primary` 兩種 variant（`padding: 0.5625rem 1rem` = 9px/16px、`box-shadow: $btnBoxShadow` = `0px 4px 2px 0px rgba(0,0,0,.25)`），不用另外刻按鈕樣式

`ic_back`／`ic_next` 圖示專案已有對應的 `IconBack`／`IconNext`（`currentColor`，跟其他頁面共用），不用新刻。快速選取 chip 原本考慮沿用 `AppPill.vue`，但 `AppPill` 是純展示用的 `<span>` 標籤（padding/圓角/字級都跟設計稿量到的不一樣，且不是按鈕語意），跟這裡需要可點擊、樣式吻合設計稿的 chip 不同，所以在新元件內部另外刻 `.quickChip`，沒有動 `AppPill`。

## 跟設計稿的落差與判斷

Figma 這個節點的 mock 資料本身有兩處不一致，這裡記錄判斷依據：

1. 開始／結束輸入框顯示「2026/07/08」「2026/07/22」，但月曆實際反白的區間卻是 7/8 到 7/31（`d8`、`d31` 是深藍底端點，中間 `d9`-`d30` 是淺藍底）——推測是設計稿製作時的示意資料沒對齊，不影響要做的功能：日期格的視覺規則（起訖＝深藍實心、區間內＝淺藍、區間外＝其他）才是真正要落地的規格，不逐字複製這組不一致的示意數字，而是用真正的互動狀態（`draftStart`／`draftEnd`）去驅動。
2. 左邊 7 月的區間外日期（1-7 號）文字是深藍 `#2e3567`，右邊 8 月完全沒有選取的日期文字卻是灰色 `#b4b9c4`——兩個月曆對「未選取日期」用了不同顏色，沒有一個能同時解釋兩邊的規則（不是「本月／下月」的區別，因為兩個月曆本身都是可互動、可各自被選取的正常月曆）。判斷這是設計稿的示意疏漏，因此改採一致、可預期的規則：**所有不在已選區間內的日期一律用灰色 `#b4b9c4`**，區間內（含起訖）才用深藍／白字——這是日期區間選擇器常見的慣例（未選＝淡化、已選＝強調色），也是兩個月曆都適用的單一規則。

## 做了什麼

- 新增 `src/components/DateRangeCalendarPanel.vue`：雙月曆日期區間面板元件。內部維護 `draftStart`／`draftEnd` 草稿狀態（元件用 `v-if` 每次重新掛載即重置，跟 `ImagePickerDialog` 用同一種重置手法），點日期格套用「起點→訖點→重新開始」的一般區間選取邏輯（訖點早於起點時自動互換），套用時才透過 `apply` 事件把最終 `start`／`end` 交還父層；快速選取 chip 用實際的 `Date`（過去 7 天／上個月整月／本季至今／今年至今）算出區間並自動把月曆導覽跳到起始月份；「套用」按鈕在區間跨度 > `maxRangeDays`（預設 365）或起訖任一為空時停用
- `src/views/UsageView.vue`：原本的雙 `<input type="date">` 改成一顆顯示目前區間（`YYYY/MM/DD – YYYY/MM/DD`）的觸發按鈕，點擊後在下方浮出 `DateRangeCalendarPanel`（`position: absolute`，對齊設計稿的浮動面板陰影／圓角），選單開闔與點外面/按 Escape 關閉透過既有 `useDismissableMenu` composable 處理（觸發按鈕跟面板包在同一個 `ref` 容器內，避免點觸發按鈕本身被 pointerdown 監聽誤判成「點外面」而跟 click handler 的開闔互踩）；`selectRange('custom')` 切換或再次點擊「自訂」chip 都會打開面板；面板送出 `apply` 才真正呼叫既有的 `applyCustomRange()` 觸發資料更新
- `src/lang/zh-Hant.ts`／`src/lang/en.ts`：`usage.customRange` 補上面板需要的新 key（`monthLabel`、`maxRangeHint`、`weekdays`、`quick`、`prevMonth`、`nextMonth`），`start`／`end` 從原本給螢幕閱讀器用的隱藏文字「開始日期」「結束日期」改成面板上實際會顯示出來的短標籤「開始」「結束」（對齊 Figma `fg_開始`／`fg_結束` 的文字）
- 用 Playwright 依實際 CSS 數值渲染面板的靜態版本（開始 2026/07/08、結束 2026/07/31），核對雙月曆並排、輸入框主/次邊框、起訖端點與區間內底色連续帶、chip／按鈕排版都跟 Figma 截圖一致

## 影響範圍

只影響 `UsageView.vue` 的「自訂」區間互動方式（從裸 input 改成下拉面板）與新元件本身；`usage.customRange.apply`／既有 `customStart`／`customEnd`／`applyCustomRange`／`customRangeValid` 的資料流與既有 KPI／燃盡圖／模組消耗等其他區塊完全沒變。`useDismissableMenu` composable 本身沒有修改，只是多一個消費者，一併把 `dismissable-menu-composable` spec 的 trace 補上 `UsageView.vue`。
