## MODIFIED Requirements

### Requirement: 以量表呈現本月額度使用

用量統計 SHALL 以 `GET /feeds` 的 `monthUsed`／`monthlyLimit` 呈現「本月已用 X／上限 Y」與百分比，並以量表標出目前進度與 80% 告警門檻；`monthlyLimit` 為 `null` 時 SHALL 顯示「無上限」，SHALL NOT 顯示量表、剩餘顆數、百分比與告警。錢包餘額（`balance`）SHALL 另行一行顯示。「預計用罄」SHALL 依 (上限 − 本月已用) ÷ 所選期間日均 推算天數，無上限或日均為 0 時顯示「—」，已用達上限顯示「已用罄」。「較前期」SHALL 顯示 `GET /feeds/usage` 的 `vsLastMonthPct`（前一個等長區間），`null` 顯示「—」。SHALL NOT 顯示預測月底、上月同期等推估值。

#### Scenario: 有設定月上限

- **WHEN** `GET /feeds` 回 `monthUsed: 3760`、`monthlyLimit: 5000`
- **THEN** 顯示「本月已用 3,760 / 上限 5,000 顆 · 75%」，量表 75%，告警線在 80%，剩餘 1,240 顆

##### Example: 預計用罄

| 上限 | 本月已用 | 期間日均 | 顯示 |
| ---- | -------- | -------- | ---- |
| 5000 | 3760     | 62       | 約 20 天 |
| 5000 | 5000     | 62       | 已用罄 |
| null | 3760     | 62       | —    |
| 5000 | 3760     | 0        | —    |

#### Scenario: 沒有設定月上限

- **WHEN** `GET /feeds` 回 `monthlyLimit: null`
- **THEN** 額度區塊顯示「本月已用 3,760 顆 · 無上限」，不顯示量表、剩餘、百分比與告警提示

#### Scenario: 載入失敗

- **WHEN** `GET /feeds/usage` 任一發失敗
- **THEN** 用量分頁顯示 `role="alert"` 的錯誤文字（真後端訊息或「載入失敗，請重新整理頁面。」），上一筆成功資料維持不動

### Requirement: 以燃盡圖呈現消耗趨勢與預測

用量統計 SHALL 以 `GET /feeds/usage?groupBy=day` 的 `daily` 畫出所選期間的實際累積折線與每日長條；`monthlyLimit` 有值時 SHALL 加畫額度上限線與 80% 告警線，無上限時 SHALL NOT 畫這兩條線。SHALL NOT 畫預測曲線、預測點或「上月同期」。x 軸刻度與期間標籤 SHALL 取回應的 `period.from`／`period.to`。

#### Scenario: 切換期間

- **WHEN** 使用者點「近 30 天」
- **THEN** 同時發出 `groupBy=day` 與 `groupBy=module` 兩發 `GET /feeds/usage?period=30d`，折線與長條改畫回傳的 30 個點

##### Example: 期間對照

| chip   | period 參數 | 附加參數                                  |
| ------ | ----------- | ----------------------------------------- |
| 本月   | month       | timezone                                  |
| 近 30 天 | 30d       | timezone                                  |
| 近 90 天 | 90d       | timezone                                  |
| 自訂   | custom      | startDate、endDate、timezone（瀏覽器時區） |

#### Scenario: 匯出 CSV

- **WHEN** 使用者按「匯出」
- **THEN** 下載的 CSV 含期間、期間用量、日均，以及每日一列（日期、消耗飼料）與每模組一列（模組、消耗飼料、占比），資料來自後端回應

### Requirement: 依模組呈現消耗分佈

用量統計 SHALL 以 `GET /feeds/usage?groupBy=module` 的 `byModule` 清單渲染模組卡片，有幾格畫幾格、順序照後端；模組名稱 SHALL 以 i18n 對照 `type`（`generate`／`marketingImage`／`marketingText`／`video`／`tryon`），對不到的 `type` SHALL 顯示原字串；顏色 SHALL 依固定色盤按索引循環指派。每格 SHALL 顯示消耗顆數、占比％、較前期％（`vsLastMonthPct` 為 `null` 顯示「—」）與平均顆數／次。

#### Scenario: 使用者檢視模組消耗

- **WHEN** 後端回傳五格 `byModule`
- **THEN** 畫出五張卡片：圖生圖、行銷海報圖、行銷文案、圖生影、AI 試穿，各自顯示 `used`、`sharePct`、`vsLastMonthPct`、`avgPerGen`

##### Example: 較前期顯示

| vsLastMonthPct | 顯示      |
| -------------- | --------- |
| 18             | 較前期 +18% |
| -9             | 較前期 -9%  |
| null           | 較前期 —    |

### Requirement: 自訂區間用雙月曆面板挑選日期

用量統計的「自訂」區間 SHALL 提供一個雙月曆日期區間挑選面板（對齊 Figma `panel_calendar`，node `1151:862`），取代單純的原生日期輸入框；面板 SHALL 顯示開始／結束日期框、左右並排兩個可各自導覽上下月的月曆、四個快速選取（過去 7 天／上個月／本季／今年至今）與取消／套用動作，且只有在使用者按下「套用」時才會真正套用新的區間。面板的預設區間 SHALL 為「今天往前 30 天」到「今天」（本地日期）。套用後 SHALL 以 `period=custom` 帶 `startDate`、`endDate` 與瀏覽器時區（`Intl.DateTimeFormat().resolvedOptions().timeZone`）重新請求。

#### Scenario: 開啟自訂區間面板

- **WHEN** 使用者點擊「自訂」區間 chip，或再次點擊已顯示目前區間的觸發按鈕
- **THEN** 在觸發按鈕下方浮出雙月曆面板（白底、`#d2d5dd` 邊框、12px 圓角、`0 8px 12px rgba(0,0,0,.16)` 陰影），預設起訖為今天往前 30 天到今天

#### Scenario: 點選日期建立區間

- **WHEN** 使用者在月曆上點選一個日期，且目前草稿還沒有完整的起訖區間
- **THEN** 該日期成為草稿起點；若再點選一個不早於起點的日期，則成為草稿訖點；若點選的日期早於已選起點，則兩者互換（訖點永遠不早於起點）

#### Scenario: 日期格依是否在選取區間內呈現不同樣式

- **WHEN** 面板顯示月曆日期格
- **THEN** 起訖兩端的日期格 SHALL 顯示深藍（`$blue-dark-500`）底、白色粗體文字、8px 圓角；區間內（不含起訖）的日期格 SHALL 顯示淺藍（`$blue-light`）底、深藍文字、不帶圓角（讓相鄰格子的底色連成一條）；不在選取區間內的日期格 SHALL 顯示灰色（`$gray-100`）文字、無底色

#### Scenario: 快速選取自動帶出區間並套用有效性檢查

- **WHEN** 使用者點擊「過去 7 天」「上個月」「本季」或「今年至今」任一 chip
- **THEN** 面板 SHALL 依實際日期算出對應區間，把草稿起訖設為該區間，並把月曆導覽跳到起始月份

#### Scenario: 套用或取消

- **WHEN** 草稿起訖皆已選取且區間跨度（含頭含尾）不超過 366 天，使用者按下「套用」
- **THEN** 面板 SHALL 把最終起訖交還給頁面並關閉面板，頁面以 `period=custom&startDate=…&endDate=…&timezone=…` 重新請求；**WHEN** 草稿起訖任一為空或區間跨度超過 366 天，「套用」按鈕 SHALL 停用並顯示「最長可選 366 天」；**WHEN** 使用者按下「取消」、點擊面板以外的地方或按下 Escape，面板 SHALL 直接關閉，不套用任何變更
