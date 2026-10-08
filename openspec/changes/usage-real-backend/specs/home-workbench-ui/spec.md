## MODIFIED Requirements

### Requirement: 狀態列顯示帳號與品牌狀態

狀態列 SHALL 顯示使用者的 AI 飼料餘額（含可再生成數量的估算，估算值 SHALL 取 `GET /feeds` 的 `estImages`／`estVideos`，SHALL NOT 用前端寫死的單價計算）、本月已用飼料顆數（`GET /feeds` 的 `monthUsed`），以及品牌設定是否完成，三者各自以獨立的視覺區塊呈現。

#### Scenario: 顯示本月已用飼料

- **WHEN** `GET /feeds` 回 `balance: 1224`、`monthUsed: 16`、`estImages: 153`、`estVideos: 27`
- **THEN** 第一格顯示「1,224 顆」與「≈ 可生成 153 張圖 / 27 支短影片」，第二格顯示「16 顆」與「本月已用飼料」

#### Scenario: 品牌設定已完成

- **WHEN** 使用者的品牌檔案已填寫名稱、定位，且至少有一組色票
- **THEN** 狀態列用一個獨立的成功狀態圖示（而非文字符號前綴）搭配「品牌設定已完成」文字，呈現完成狀態

#### Scenario: 品牌設定尚未完成

- **WHEN** 使用者的品牌檔案缺少名稱、定位或色票
- **THEN** 狀態列顯示未完成狀態，並提示使用者前往補齊品牌設定
