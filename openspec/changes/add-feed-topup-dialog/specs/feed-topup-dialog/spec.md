## ADDED Requirements

### Requirement: 使用者可透過彈出式視窗選擇飼料套餐並模擬儲值

使用者點擊頂部工具列或首頁的飼料圖示、「儲值」／「＋ 儲值飼料」按鈕時，SHALL 開啟一個彈出式視窗（`TopUpDialog`），SHALL NOT 導航到其他頁面。彈窗 SHALL 顯示 3 個固定飼料套餐（500 顆／1500 顆／3000 顆），使用者可以點選其中一個標記為選取狀態，同時間 SHALL 只有一個套餐被選取。「確認儲值」按鈕在未選取任何套餐時 SHALL disable，選取後 SHALL 變成可點擊。

#### Scenario: 使用者從頂部工具列開啟儲值彈窗

- **WHEN** 使用者點擊頂部工具列的飼料圖示或「儲值」按鈕
- **THEN** 畫面開啟 `TopUpDialog` 彈窗，顯示 3 個套餐選項，SHALL NOT 導航離開目前頁面

##### Example:

- **GIVEN** 使用者在 `/library` 頁面，頂部工具列顯示「1,240 顆」飼料餘額
- **WHEN** 使用者點擊飼料圖示
- **THEN** 彈窗開啟，網址列仍然是 `/library`（不是 `/usage`），顯示「500 顆」「1500 顆」「3000 顆」三個套餐卡片

#### Scenario: 使用者從首頁開啟儲值彈窗

- **WHEN** 使用者點擊首頁飼料餘額旁的圖示或「＋ 儲值飼料」按鈕
- **THEN** 畫面開啟 `TopUpDialog` 彈窗，顯示 3 個套餐選項

#### Scenario: 未選取套餐時確認按鈕停用

- **WHEN** 彈窗剛開啟，使用者尚未點選任何套餐
- **THEN** 「確認儲值」按鈕 SHALL 為 disable 狀態，點擊無反應

#### Scenario: 選取套餐後確認按鈕啟用

- **WHEN** 使用者點選其中一個套餐卡片
- **THEN** 該套餐卡片標記為選取狀態，「確認儲值」按鈕 SHALL 變成可點擊；若使用者改點另一個套餐，SHALL 只有新點的套餐維持選取狀態

### Requirement: 確認儲值後立即模擬交易並更新餘額顯示

使用者選取套餐並點擊「確認儲值」後，畫面 SHALL 呼叫模擬儲值的 API，成功後 SHALL 立即把選取套餐的顆數加進飼料餘額，且畫面上（頂部工具列與首頁）顯示的飼料餘額數字 SHALL 同步更新，SHALL NOT 需要重新整理頁面才看得到新餘額。彈窗 SHALL 切換成顯示成功訊息，使用者點擊「完成」按鈕後彈窗 SHALL 關閉並重置選取狀態。

#### Scenario: 確認儲值後餘額立即更新

- **WHEN** 使用者選取「1500 顆」套餐並點擊「確認儲值」
- **THEN** 飼料餘額 SHALL 立即增加 1500，彈窗顯示包含「1500」顆數的成功訊息

##### Example:

- **GIVEN** 使用者目前飼料餘額為「1,240 顆」，選取「1500 顆」套餐
- **WHEN** 使用者點擊「確認儲值」
- **THEN** 儲值成功後，頂部工具列與首頁顯示的飼料餘額都變成「2,740 顆」，彈窗顯示「已儲值 1500 顆！」之類的成功訊息

#### Scenario: 使用者關閉成功畫面後可以再次開啟乾淨的彈窗

- **WHEN** 使用者在成功畫面點擊「完成」關閉彈窗，之後再次點擊飼料圖示重新開啟彈窗
- **THEN** 彈窗 SHALL 回到初始狀態（沒有任何套餐被選取，不是停留在上次的成功畫面）

#### Scenario: 真後端模式下不支援模擬儲值

- **WHEN** 使用者在串接真後端（非 mock）的環境點擊「確認儲值」
- **THEN** 畫面 SHALL 顯示明確的不支援訊息，SHALL NOT 呼叫不存在的 API 方法造成執行期錯誤或白屏

### Requirement: 全站飼料圖示只要不巢狀在既有互動元素內，皆可點擊開啟儲值彈窗

除了頂部工具列與首頁既有的兩個入口，`src/components/ConfirmGenerateDialog.vue`、`src/components/ImageEditorWorkspace.vue`（AI 已使用工具的成本清單與總計）、`src/views/GenerateImageView.vue`、`src/views/GenerateVideoView.vue`、`src/views/MarketingPostView.vue`（預估花費區塊）、`src/views/TryOnView.vue`、`src/views/UsageView.vue` 顯示的飼料圖示 SHALL 都能點擊並開啟 `TopUpDialog`。圖示若巢狀在既有的互動元素內（`router-link`、其他 `button`、`label` 底下重複多筆的清單項目），SHALL NOT 額外包一層按鈕，維持原本的既有行為。

#### Scenario: 生成前確認彈窗的飼料圖示可以點擊儲值

- **WHEN** 使用者在 `ConfirmGenerateDialog` 看到「預估花費」或「目前餘額」旁的飼料圖示並點擊
- **THEN** `ConfirmGenerateDialog` SHALL 先關閉，接著開啟 `TopUpDialog`，SHALL NOT 讓兩個對話框同時開著

##### Example:

- **GIVEN** 使用者在圖生圖流程按下「生成」，彈出 `ConfirmGenerateDialog` 顯示「預估花費 12 顆」與「目前餘額 5 顆」
- **WHEN** 使用者點擊「目前餘額」旁的飼料圖示
- **THEN** `ConfirmGenerateDialog` 關閉，`TopUpDialog` 開啟顯示 3 個套餐選項

#### Scenario: AI 生成工作台各頁面的成本提示圖示可以點擊儲值

- **WHEN** 使用者在 `GenerateImageView`、`GenerateVideoView`、`MarketingPostView`、`TryOnView` 任一頁面點擊「預估花費」旁的飼料圖示
- **THEN** 畫面開啟 `TopUpDialog`，SHALL NOT 導航離開目前頁面

#### Scenario: 飼料用量頁面的圖示可以點擊儲值

- **WHEN** 使用者在 `UsageView`（飼料用量頁）點擊配額、量表、模組明細或指標卡片旁的飼料圖示
- **THEN** 畫面開啟 `TopUpDialog`

#### Scenario: 巢狀在既有互動元素內的圖示維持原本行為，不變成獨立按鈕

- **WHEN** 使用者點擊 `MarketingPostView` 輸出類型選項卡片內的飼料圖示、`ImageEditorWorkspace` 工具按鈕或修圖選項清單內的飼料圖示、`DefaultLayout` 側邊導覽「飼料用量」連結
- **THEN** SHALL 維持原本各自的既有行為（選取輸出類型／選取工具或選項／導覽到 `/usage`），SHALL NOT 額外開啟 `TopUpDialog`

### Requirement: 首頁工具卡片的飼料徽章可以點擊儲值，不影響卡片本身的導覽

`src/views/HomeView.vue` 每張工具卡片右上角的 `IconFeedBottleBadge.card__feedBadge` 徽章 SHALL 可以點擊並開啟 `TopUpDialog`。卡片其餘區域（圖示、標題、說明文字）SHALL 維持原本導覽到對應生成頁面的行為，SHALL NOT 因為徽章變成按鈕而失去可點擊導覽的能力。

#### Scenario: 點擊卡片徽章開啟儲值彈窗

- **WHEN** 使用者點擊工具卡片右上角的飼料徽章
- **THEN** 畫面開啟 `TopUpDialog`，SHALL NOT 導航到該卡片對應的生成頁面

##### Example:

- **GIVEN** 使用者在首頁看到「AI 生成行銷 PO 文」卡片，右上角有飼料徽章
- **WHEN** 使用者點擊該徽章
- **THEN** `TopUpDialog` 開啟，網址列仍然是首頁（不是 `/generate/post`）

#### Scenario: 點擊卡片其餘區域維持原本的導覽行為

- **WHEN** 使用者點擊工具卡片的圖示、標題或說明文字（徽章以外的區域）
- **THEN** SHALL 導航到該卡片對應的生成頁面，SHALL NOT 開啟 `TopUpDialog`
