## Context

`UsageView.vue` 的「AI 表現指標」分頁已把四項指標做出來，但設計稿（MV-07，frame `16:2`）補了飼料圖示與「需前端埋點」的說明。此 change 與 `sync-mv-06-design`（MV-06 用量統計）同屬 section ⑧、共用 `UsageView.vue`，但為獨立 frame 故拆開追蹤。

## Goals / Non-Goals

**Goals:**

- 四項指標與其資料來源說明對齊設計稿。

**Non-Goals:**

- 不接真實埋點；`getMetrics` 維持 mock，並誠實標示需埋點。

## Decisions

- **保留「需前端埋點」的誠實標示。** 這四項要準確必須有真實的生成／採用事件埋點，設計稿本身就標明；實作時保留此說明，避免誤導為已接真實數據。
- **與 MV-06 共用 `UsageView.vue` 但拆為獨立 change。** 兩者是同一 view 的兩個分頁、對應兩個 Figma frame；拆開讓「一個 frame 一個 change」的追蹤更清楚，實作時仍在同一檔案的不同分頁。
