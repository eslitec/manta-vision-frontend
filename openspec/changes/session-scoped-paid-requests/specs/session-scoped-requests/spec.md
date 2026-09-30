## Purpose

帳號範圍的狀態與進行中的付費請求都綁在送出當下的登入身分上：登出或換帳號後看不到、也扣不到上一個帳號的東西，已受理的付費生成在定案前不會因重試而重複扣點。

## ADDED Requirements

### Requirement: 登出清除帳號範圍的快取

登出（含 token 失效的強制登出）時，系統 SHALL 清除飼料餘額與資料夾清單並放掉各自的已載入旗標，使下一個帳號登入後重新呼叫 `GET /feeds` 與 `GET /folders`。登出前發出、登出後才回來的 `GET /feeds` 與 `GET /folders` 回應 SHALL NOT 寫回狀態。

#### Scenario: 換帳號不顯示上一個人的餘額與資料夾

- **WHEN** 帳號 A 已載入餘額與資料夾後登出
- **THEN** 餘額歸零、資料夾清單為空，且下一次不帶 force 的載入會重新打 API

#### Scenario: 晚到的回應被丟棄

- **WHEN** `GET /feeds` 或 `GET /folders` 尚未回應時登出，回應之後才回來
- **THEN** 餘額與資料夾維持清空後的狀態

### Requirement: 影片建立的晚到回應不得建立任務

`createVideoTask` 送出 `POST /video` 後、回應回來前若已登出，系統 SHALL 丟棄該回應並以 `SESSION_CHANGED` 拒絕，SHALL NOT 把任務加入任務中心，SHALL NOT 啟動輪詢。

#### Scenario: 建立影片途中登出

- **WHEN** `POST /video` 尚未回應時登出，之後回應才回來
- **THEN** 任務中心沒有該任務，也沒有任何 `GET /video/{taskId}` 送出

### Requirement: 付費請求綁定送出當下的登入身分

付費請求開始時系統 SHALL 記下登入身分（token 與 botId）；每次自動重送 POST 之前與每次輪詢 `GET /generations/{id}` 之前 SHALL 確認身分未變，已變則 SHALL 中止並丟出 `SESSION_CHANGED`，SHALL NOT 以新的憑證重送或輪詢。登出時系統 SHALL 清掉所有尚未定案的 `Idempotency-Key`。

#### Scenario: 等待重送時換帳號

- **WHEN** 帳號 A 的付費 POST 逾時、正在等待重送時登出並登入帳號 B
- **THEN** 不再送出第二發 POST，呼叫端收到 `SESSION_CHANGED`

#### Scenario: 輪詢時換帳號

- **WHEN** 帳號 A 的生成回 202、輪詢進行中登入身分改變
- **THEN** 不再送出 `GET /generations/{id}`，呼叫端收到 `SESSION_CHANGED`

#### Scenario: 登出清掉未定案的 key

- **WHEN** 一次付費請求結果不確定（key 保留中）後登出，再以相同輸入送出
- **THEN** 使用新的 `Idempotency-Key`

### Requirement: 202 受理後保留冪等鍵直到輪詢定案

對 202 代表「已受理、尚未完成」的付費端點（`/generate`、`/marketing/image`、`/marketing/text`、`/tryon`、`/edit`），系統 SHALL 保留該次操作的 `Idempotency-Key` 直到輪詢得到 `done` 或 `failed`；保留期間以相同輸入再送 SHALL 帶同一把 key。`POST /video` 的 202 是完整答案，SHALL 維持收到即丟 key。

#### Scenario: 輪詢沒定案就斷掉後重試

- **WHEN** 生成回 202 後輪詢收到 404 或超過等待上限，使用者以相同輸入再送一次
- **THEN** 第二發 POST 帶與第一發相同的 `Idempotency-Key`

#### Scenario: 輪詢定案後再生成

- **WHEN** 生成回 202 後輪詢得到 `done` 或 `failed`，使用者以相同輸入再送一次
- **THEN** 第二發 POST 帶新的 `Idempotency-Key`
