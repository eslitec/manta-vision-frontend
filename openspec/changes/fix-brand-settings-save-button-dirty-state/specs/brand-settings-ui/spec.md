## ADDED Requirements

### Requirement: 儲存設定按鈕反映實際的未儲存變更狀態

品牌設定頁「儲存設定」按鈕的 disable 狀態 SHALL 只反映「目前表單內容是否跟已儲存的品牌設定不同」。資料尚未從後端載入完成時，按鈕 SHALL disable；資料載入完成後，只要使用者尚未變更任何欄位，按鈕 SHALL 維持 disable，SHALL NOT 因為頁面初次掛載或重新掛載就顯示成可點擊狀態。

#### Scenario: 首次進入頁面且未變更任何欄位

- **WHEN** 使用者第一次進入品牌設定頁，品牌資料已從後端載入完成，使用者尚未變更任何欄位
- **THEN** 「儲存設定」按鈕 SHALL 為 disable 狀態

##### Example:

- **GIVEN** 使用者的品牌設定已經儲存過（例如品牌名稱「日安選物」、已上傳 Logo）
- **WHEN** 使用者點擊「設定」進入「品牌資訊維護」頁，資料載入完成
- **THEN** 「儲存設定」按鈕顯示為 disable，不能點擊

#### Scenario: 使用者變更欄位後按鈕變成可點擊

- **WHEN** 使用者變更任一品牌設定欄位（例如品牌名稱、Logo、色票、文案語氣）
- **THEN** 「儲存設定」按鈕 SHALL 變成可點擊（enabled）狀態

#### Scenario: 儲存成功後按鈕變回 disable

- **WHEN** 使用者點擊「儲存設定」且儲存成功
- **THEN** 「儲存設定」按鈕 SHALL 變回 disable 狀態

#### Scenario: 離開頁面再返回，未做新變更時按鈕仍須 disable

- **WHEN** 使用者成功儲存設定後，切換到其他頁面（例如「飼料用量」），再切回「品牌視覺識別」分頁，過程中沒有做任何新的變更
- **THEN** 「儲存設定」按鈕 SHALL 維持 disable 狀態，SHALL NOT 因為頁面重新掛載就變成可點擊

##### Example:

- **GIVEN** 使用者剛成功儲存品牌設定，按鈕目前是 disable
- **WHEN** 使用者點擊左側導覽「飼料用量」，再點擊「設定」切回「品牌視覺識別」分頁
- **THEN** 「儲存設定」按鈕仍然是 disable 狀態

#### Scenario: 取消變更後按鈕變回 disable

- **WHEN** 使用者變更欄位後點擊「取消」，表單內容還原成上次儲存的內容
- **THEN** 「儲存設定」按鈕 SHALL 變回 disable 狀態
