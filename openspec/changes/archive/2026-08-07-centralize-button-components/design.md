## Context

見 `proposal.md` 的 Why。這次盤點是在做 MV-01（`sync-mv-01-design`）的過程中，使用者直接指出 `TryOnView.vue` 跟其他檔案都有 `.btn-plain`／`.btn-primary` 重複定義而發起的，範圍後來擴大到「以此類推」找到的其他 3 組重複樣式（`.btn-outline`、`.chip-dark`／`.chip-plain`），跟 MV-01 本身的視覺校對無關，所以獨立成自己的 change，不掛在 `sync-mv-01-design` 底下。

## Goals / Non-Goals

**Goals:**
- 把已經確認重複（≥2 個檔案逐字複製貼上）的按鈕樣式收斂成共用元件，消除之後改一個地方要同步改多個檔案的風險。
- 過程中不改變任何畫面現有的可觀察行為或視覺呈現（除了消除細微的複製貼上數值漂移）。

**Non-Goals:**
- 不重新設計這些按鈕的視覺樣式——這是純重構，不是設計校對；如果之後 Figma 提供更新的按鈕規格，屆時再另開 change 處理。
- 不處理只出現在單一檔案、沒有重複的按鈕樣式（例如 `LibraryView.vue` 的 `.modal__create-btn`），避免為了「集中管理」而過度抽象化尚未證明會重複的東西。

## Decisions

- **`.btn-plain`／`.btn-primary`（pill 版）／`.btn-danger` 合併成一個 `DialogButton.vue`，用 `variant` prop 區分，而不是拆成三個元件。** 這三個樣式永遠成對出現在同一個彈窗的「取消／確認」或「取消／確認刪除」按鈕組合裡，共用完全一樣的版型（`border-radius: 999px`、`padding`、`font-size`），只有顏色和邊框不同——用 variant 而不是三個獨立元件，呼叫端可以直接看出「這是彈窗按鈕家族的某一種」，也跟 `OutlineButton` 已經建立的 `variant` prop 慣例一致。
- **CTA 版的 `.btn-primary`（10px 圓角＋陰影）獨立成 `PrimaryButton.vue`，跟 `DialogButton` 的 primary variant 分開，即使兩者都叫「primary」。** 這兩個視覺上明顯不同（圓角、陰影、使用情境都不同：一個是頁面主要動作，一個是彈窗確認），只是原始程式碼恰好都取名 `.btn-primary` 才顯得像同一個東西。拆成兩個元件保留這個語意區別，避免把兩種不同用途的按鈕硬綁在同一個元件上、之後要用 if/else 判斷情境。
- **`TryOnView.vue` 的肖像同意彈窗「我同意」按鈕，維持用 `PrimaryButton`（CTA 版），不是 `DialogButton` 的 primary variant。** 原始程式碼裡這顆按鈕就是直接沿用該檔案全域的 `.btn-primary`（CTA 版），視覺上是圓角＋陰影，跟其他彈窗的 pill 版確認按鈕不一樣——這是現有程式碼裡的既存不一致，這次重構的目標是「消除重複的 CSS 定義」，不是「順手把它改成看起來更一致的樣子」，所以按現況原封不動保留，避免沒有 Figma 依據的視覺變動。
- **`.btn-outline` 獨立成 `GhostButton.vue`，跟已經存在的 `OutlineButton.vue` 分開，不合併。** 兩者名稱相近但視覺不同：`OutlineButton` 是 MV-00／MV-01 依 Figma 精確數值做的元件（邊框色 `$blue-dark-300`、圓角 18px、有 hover/active 互動狀態）；`.btn-outline` 是邊框色 `$gray`、圓角 999px（全圓角）、沒有互動狀態設計。硬合併成一個元件需要引入額外的 variant 去處理兩種边框色/圆角/互動狀態的組合，反而讓一個原本單純的元件變複雜；兩者維持獨立、各自負責一種既有的視覺慣例。
- **`.chip-dark`／`.chip-plain` 合併成 `ChipButton.vue`，用 `variant` prop 區分，理由跟 `DialogButton` 一樣**：兩者永遠成對出現在生成結果的動作列（存入圖庫／下載／重生成／複製文案），共用版型只有顏色不同。
- **微小的數值漂移統一取其中一個值，不逐一保留每個檔案原本的細微差異**：例如 `.btn-outline` 的 padding 在 4 個檔案是 `8px 16px`、`UsageView.vue` 是 `9px 18px`，統一用 `8px 16px`（多數檔案的值）；CTA 版 `.btn-primary` 的 padding 多數是 `11px 20px`、`BrandSettingsView.vue` 是 `11px 24px`，統一用 `11px 20px`。這些差異在 1-4px 之間，畫面上幾乎無法察覺，維持「共用元件只有一種標準版型」比逐一保留每個檔案的歷史漂移更有意義——如果之後 Figma 證實某個檔案的按鈕真的需要不同 padding，屆時再加 prop 因應，不預先假設。

## Risks / Trade-offs

- [統一數值後，任何一個檔案的按鈕跟該頁面原本的 Figma 設計稿如果曾經有意做出微小差異，這次會被抹平] → 目前沒有證據顯示這些差異是刻意設計（比較像是複製貼上的隨機漂移），且差異都在幾個像素內；如果之後比對 Figma 發現某處真的需要不同數值，再回來加 variant 或 prop，不是不可逆的決定。

## Open Questions

（無）
