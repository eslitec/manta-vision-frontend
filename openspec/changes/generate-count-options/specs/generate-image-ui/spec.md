## ADDED Requirements

### Requirement: 生成張數選項

圖生圖頁的「生成張數」SHALL 提供 1、2、3、4 四個選項（pill），預設選 2；預估消耗 SHALL 等於所選檔位單價乘以所選張數；送出的 `GenerateImageReq.count` SHALL 等於所選張數。「重新生成」SHALL NOT 受此選項影響，仍固定 1 張。

#### Scenario: 選 1 張

- **WHEN** 標準檔單價 8，使用者點「1 張」
- **THEN** 預估消耗顯示 8，送出時 `count: 1`

#### Scenario: 選 3 張

- **WHEN** 標準檔單價 8，使用者點「3 張」
- **THEN** 預估消耗顯示 24，送出時 `count: 3`，成功後出現 3 張結果卡
