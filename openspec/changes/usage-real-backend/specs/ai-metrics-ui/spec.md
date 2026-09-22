## MODIFIED Requirements

### Requirement: 呈現四項 AI 表現指標

AI 表現指標 SHALL 以所選期間（與用量統計共用同一組期間 chip，預設「近 30 天」）呼叫 `GET /metrics`，呈現生成成功率、採用率、平均重生成次數與每採用素材成本，各附一句說明其定義。任一指標為 `null` 時 SHALL 顯示「—」。每張卡 SHALL 顯示與前一個等長區間的絕對差（`vsLastPeriod`），文案依欄位單位：成功率與採用率為「較前期 {delta} 個百分點」、平均重生成為「較前期 {delta} 次」、每採用素材成本為「較前期 {delta} 顆」；差值為 `null` 時顯示「—」。載入失敗 SHALL 顯示 `role="alert"` 的錯誤文字。

#### Scenario: 使用者檢視表現指標

- **WHEN** `GET /metrics?period=30d` 回 `successRate: 96.2`、`adoptionRate: 68.4`、`avgRegenerate: 1.7`、`costPerAdopted: 6.1`，`vsLastPeriod: { successRate: 1.8, adoptionRate: 4.2, avgRegenerate: -0.3, costPerAdopted: -0.8 }`
- **THEN** 顯示 96.2%（較前期 +1.8 個百分點）、68.4%（較前期 +4.2 個百分點）、1.7 次（較前期 -0.3 次）、6.1（帶飼料圖示，較前期 -0.8 顆）

##### Example: null 顯示

| 欄位            | 值   | 較前期 | 顯示            |
| --------------- | ---- | ------ | --------------- |
| successRate     | null | null   | —／—            |
| adoptionRate    | 68.4 | null   | 68.4%／—        |
| costPerAdopted  | 6.1  | -0.8   | 6.1／較前期 -0.8 顆 |

#### Scenario: 切換期間

- **WHEN** 使用者在指標分頁點「近 90 天」
- **THEN** 發出 `GET /metrics?period=90d&timezone=…`，四卡改顯示回傳值

## REMOVED Requirements

### Requirement: 標示指標需前端埋點

**Reason**: 四項指標已由後端 `GET /metrics` 依 `generation_logs` 實算，「需前端埋點才能取得真實數據」的提示已不成立。

**Migration**: 移除 `UsageView.vue` 的 `.trackingNote` 區塊與 `usage.tracking.*` i18n 字串。
