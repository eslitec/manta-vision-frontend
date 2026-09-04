## Purpose

登入功能（login-gate）讓使用者必須先通過帳號密碼驗證才能存取系統的其餘頁面，並在重新整理瀏覽器後維持登入狀態，提供可用的登出。

## ADDED Requirements

### Requirement: 未登入時導向登入頁
系統 SHALL 在使用者未登入的狀態下，將任何非登入頁的路由請求導向登入頁，並記住原本要去的路徑。

#### Scenario: 未登入使用者訪問受保護頁面
- **WHEN** 未登入的使用者訪問 `/library`
- **THEN** 系統導向 `/login`，並在網址帶上 `redirect=/library`

##### Example: 導向並保留原目的地
- **GIVEN** 使用者尚未登入
- **WHEN** 使用者直接訪問 `/generate/video`
- **THEN** 瀏覽器網址列變成 `/login?redirect=/generate/video`

### Requirement: 登入頁驗證帳號密碼
系統 SHALL 在登入頁提供帳號與密碼輸入欄位，送出後與後端（mock）驗證；驗證失敗時 SHALL 顯示錯誤訊息且不導頁，驗證成功時 SHALL 建立登入狀態。

#### Scenario: 輸入正確帳密送出
- **WHEN** 使用者輸入正確的帳號與密碼並送出登入表單
- **THEN** 系統建立登入狀態，畫面離開登入頁

#### Scenario: 輸入錯誤帳密送出
- **WHEN** 使用者輸入錯誤的帳號或密碼並送出登入表單
- **THEN** 系統顯示「帳號或密碼錯誤，請再試一次。」，畫面停留在登入頁

##### Example: demo 帳密驗證結果
| 帳號 | 密碼 | 結果 |
| --- | --- | --- |
| mavis | mavis123 | 登入成功 |
| mavis | wrongpass | 顯示錯誤訊息，停留在登入頁 |
| wronguser | mavis123 | 顯示錯誤訊息，停留在登入頁 |

### Requirement: 登入成功導回原本要去的頁面
系統 SHALL 在登入成功後，將使用者導向登入前原本要訪問的路徑；若沒有原目的地記錄，SHALL 導向首頁。

#### Scenario: 帶著 redirect 記錄登入成功
- **WHEN** 使用者從 `/login?redirect=/library` 成功登入
- **THEN** 系統導向 `/library`

#### Scenario: 直接訪問登入頁後登入成功
- **WHEN** 使用者直接訪問 `/login`（沒有 `redirect` 參數）並成功登入
- **THEN** 系統導向首頁 `/`

### Requirement: 登入狀態在重新整理後維持
系統 SHALL 將登入狀態持久化，使得使用者重新整理瀏覽器後仍維持登入，不需要重新輸入帳密。

#### Scenario: 登入後重新整理瀏覽器
- **WHEN** 已登入的使用者重新整理瀏覽器
- **THEN** 使用者仍維持登入狀態，停留在原路徑，不會被導向登入頁

### Requirement: 提供登出功能
系統 SHALL 提供登出操作，登出後 SHALL 清除已持久化的登入狀態並導向登入頁。

#### Scenario: 使用者點擊登出
- **WHEN** 已登入的使用者點擊側邊欄的「登出」
- **THEN** 系統清除登入狀態並導向 `/login`

#### Scenario: 登出後重新整理瀏覽器
- **WHEN** 使用者登出後重新整理瀏覽器
- **THEN** 使用者仍維持登出狀態，訪問受保護頁面會被導向登入頁

### Requirement: 已登入時訪問登入頁自動導回
系統 SHALL 在使用者已登入的狀態下，若直接訪問登入頁，自動導向首頁或原本要去的頁面，不顯示登入表單。

#### Scenario: 已登入使用者直接訪問登入頁
- **WHEN** 已登入的使用者直接訪問 `/login`
- **THEN** 系統導向首頁 `/`
