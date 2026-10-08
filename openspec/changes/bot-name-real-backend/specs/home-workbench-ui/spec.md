## ADDED Requirements

### Requirement: 側欄與麵包屑顯示目前機器人名稱

側欄品牌區與頂部工具列麵包屑第一段 SHALL 顯示目前機器人的實際名稱，SHALL NOT 寫死任何示範名稱。名稱的優先序 SHALL 為：品牌設定（`GET /brand`）的 `name` → 目前 `botId` 在 `GET /bots` 清單中對應的 `botName` → i18n 預設字串「我的品牌」。兩支 API 都尚未回應前 SHALL 顯示空白；任一支失敗 SHALL 視同沒有值，SHALL NOT 顯示錯誤或阻擋操作。`GET /bots` 與 `GET /brand` SHALL 只在登入成功後與 app 啟動（已有有效 session）時各呼叫一次，元件 SHALL NOT 各自呼叫；登出時 SHALL 清除已取得的名稱與機器人清單。

#### Scenario: 品牌設定已填名稱

- **WHEN** `GET /brand` 回 `name: "春日選品"`，`GET /bots` 回 `[{ botId: "b1", botName: "我的機器人" }]`，session 的 `botId` 為 `b1`
- **THEN** 側欄品牌區與麵包屑第一段顯示「春日選品」

#### Scenario: 品牌設定沒有名稱

- **WHEN** `GET /brand` 回 `name: ""`（或 `null`），`GET /bots` 回 `[{ botId: "b1", botName: "我的機器人" }]`
- **THEN** 側欄品牌區與麵包屑第一段顯示「我的機器人」

#### Scenario: 兩者都沒有

- **WHEN** `GET /brand` 與 `GET /bots` 都失敗或都沒有名稱
- **THEN** 顯示「我的品牌」，畫面不出現錯誤訊息

#### Scenario: 登出後換帳號

- **WHEN** 使用者登出後以另一個帳號登入
- **THEN** 側欄與麵包屑顯示新帳號的名稱，不殘留前一個帳號的名稱

## MODIFIED Requirements

### Requirement: 頂部工具列顯示目前情境與使用者身分

頂部工具列 SHALL 顯示目前品牌情境的麵包屑（第一段為目前機器人名稱，取自「側欄與麵包屑顯示目前機器人名稱」的優先序；第二段固定為「Manta Vision」）、「任務」入口、使用者的飼料餘額，以及登入者的姓名與角色。

#### Scenario: 使用者檢視頂部工具列

- **WHEN** 顯示任何已登入頁面
- **THEN** 頂部工具列顯示麵包屑、「任務」按鈕、飼料餘額徽章，以及目前使用者的姓名與角色文字（帳號擁有者顯示「擁有者」）
