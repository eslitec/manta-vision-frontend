## ADDED Requirements

### Requirement: 素材挑選彈窗可直接上傳圖片

`ImagePickerDialog.vue`（各頁面「從圖庫選擇」共用的挑選彈窗，含圖庫「編輯圖片」選底圖、編輯器「加入物件」、AI 試穿選服飾、生成圖片選參考圖、行銷 PO 文選圖、生成影片選圖）的素材格線第一格 SHALL 是「上傳圖片」卡片，六個使用處 SHALL 共用這一份實作，SHALL NOT 在各頁面另寫上傳入口。卡片 SHALL 沿用格線既有的縮圖尺寸與色系，以虛線框、加號與「上傳圖片」文字呈現；卡片 SHALL 可用鍵盤聚焦，按 Enter 或 Space SHALL 開啟檔案選擇，並 SHALL 帶有說明格式與拖放的 `aria-label`。使用者把檔案拖放到彈窗內 SHALL 同樣觸發上傳。檔案選擇的 `accept` SHALL 取自既有的支援格式常數（jpg／jpeg／png／webp），SHALL NOT 另立一份清單。上傳 SHALL 走既有的 `useAssets().upload`（真後端 `POST /upload`）：物件模式 SHALL 帶 `source=object`，其他模式 SHALL NOT 帶 `source`。上傳進行中卡片 SHALL 顯示「上傳中…」與進行中圖示，確認鈕（「選擇這張」／「加入所選」）SHALL 停用，SHALL NOT 重複送出；上傳 SHALL NOT 消耗飼料。

#### Scenario: 六個使用處的格線第一格都是上傳卡片

- **WHEN** 使用者在任一使用處開啟選圖彈窗
- **THEN** 格線第一格是「上傳圖片」卡片，其後才是圖庫素材

##### Example: 生成圖片選參考圖

- **GIVEN** 使用者在「生成圖片」頁
- **WHEN** 點擊「從圖庫選擇」
- **THEN** `.picker__grid` 的第一個子元素是 `aria-label` 為「上傳圖片（jpg／png／webp，10MB 以內），也可以把檔案拖放到這裡」的按鈕

#### Scenario: 使用鍵盤開啟檔案選擇

- **WHEN** 使用者用 Tab 聚焦到上傳卡片並按 Enter 或 Space
- **THEN** 瀏覽器開啟檔案選擇視窗，可選的檔案類型為 jpg／jpeg／png／webp

##### Example: Enter 開啟檔案選擇

- **GIVEN** 選圖彈窗已開啟、焦點在上傳卡片
- **WHEN** 按下 Enter
- **THEN** 出現檔案選擇視窗，`accept` 為 `.jpg,.jpeg,.png,.webp`

#### Scenario: 物件模式上傳帶物件來源

- **WHEN** 使用者在編輯器「加入物件」的選圖彈窗上傳圖片
- **THEN** 上傳請求帶 `source=object`，之後以 `GET /images?source=object` 查得到這張圖

##### Example: 加入物件上傳

- **GIVEN** 編輯器「加入物件」開啟的選圖彈窗
- **WHEN** 上傳 `flower.png`
- **THEN** `POST /upload` 的表單含 `source=object`；在生成圖片頁的選圖彈窗上傳則表單不含 `source`，回應的來源為 `upload`

#### Scenario: 上傳中不能重複送出

- **WHEN** 上傳尚未完成
- **THEN** 上傳卡片顯示「上傳中…」，確認鈕停用，再點卡片或再拖放檔案都不會送出第二次上傳

##### Example: 上傳中按鈕狀態

- **GIVEN** 使用者剛選了 `shirt.png`，請求尚未回應
- **WHEN** 查看彈窗
- **THEN** 上傳卡片 `aria-busy="true"`、文字為「上傳中…」，「選擇這張」為停用

### Requirement: 素材挑選彈窗上傳成功後新圖置頂並自動選取

上傳成功後，新圖 SHALL 出現在彈窗清單的最上方，並 SHALL 依彈窗既有的選取語意成為選取中的項目：單選彈窗 SHALL 以新圖取代原本的選取，多選彈窗 SHALL 把新圖加入選取。若目前的來源篩選（全部／上傳／AI 生成）或搜尋字會讓新圖不顯示，彈窗 SHALL 切回「全部」並清空搜尋，讓新圖看得見；新圖本來就看得見時 SHALL NOT 改動使用者的篩選與搜尋。使用者按下確認鈕時，彈窗 SHALL 以既有的 `select`／`select-many` 事件把新圖交回呼叫端。

#### Scenario: 上傳後新圖置頂且被選取

- **WHEN** 使用者在單選彈窗上傳一張圖並成功
- **THEN** 新圖是上傳卡片之後的第一張，顯示為已選取，其他素材取消選取

##### Example: 取代原本的選取

- **GIVEN** 單選彈窗已選取「春季新品」
- **WHEN** 上傳 `shirt.png` 成功
- **THEN** 格線第二格是 `shirt.png` 且 `aria-pressed="true"`，「春季新品」為 `aria-pressed="false"`，底部顯示「已選 1 項」

#### Scenario: 篩選會藏住新圖時切回全部

- **WHEN** 使用者在「AI 生成」篩選下（或搜尋字不符新圖名稱）上傳一張圖
- **THEN** 篩選切回「全部」、搜尋清空，新圖顯示在最上方且被選取

##### Example: AI 生成篩選下上傳

- **GIVEN** 選圖彈窗的來源篩選是「AI 生成」、搜尋框是「海報」
- **WHEN** 上傳 `shirt.png` 成功
- **THEN** 「全部」變成選中的篩選、搜尋框清空，`shirt.png` 在格線第二格且已選取

#### Scenario: 確認後呼叫端拿到新圖

- **WHEN** 使用者上傳成功後直接按「選擇這張」
- **THEN** 彈窗關閉，呼叫端收到的素材就是剛上傳的那張

##### Example: 生成圖片的參考圖

- **GIVEN** 生成圖片頁開啟選圖彈窗並上傳 `ref.png` 成功
- **WHEN** 按「選擇這張」
- **THEN** 參考圖區塊顯示 `ref.png`

### Requirement: 素材挑選彈窗上傳失敗時顯示錯誤且不新增項目

上傳失敗時，彈窗 SHALL 以 `role="alert"` 在彈窗內顯示對應訊息：檔案太大（`FILE_TOO_LARGE`／HTTP 413）SHALL 顯示「檔案超過 10MB 上限。」、格式不支援（`UNSUPPORTED_FORMAT`／HTTP 415）SHALL 顯示「不支援的檔案格式，請使用 jpg／png／webp。」，其他錯誤 SHALL 顯示後端回傳的訊息，沒有時顯示「送出失敗，請再試一次。」；錯誤文案 SHALL 重用既有 i18n 字串。失敗時清單 SHALL NOT 新增項目、選取 SHALL NOT 改變，上傳卡片 SHALL 恢復可用讓使用者再試一次；下一次上傳開始或重新開啟彈窗時 SHALL 清除錯誤訊息。

#### Scenario: 檔案太大

- **WHEN** 使用者上傳超過 10MB 的圖片
- **THEN** 彈窗顯示「檔案超過 10MB 上限。」，清單項目數不變

##### Example: 11MB 的 PNG

- **GIVEN** 清單有 7 張素材
- **WHEN** 上傳 11MB 的 `big.png`
- **THEN** `role="alert"` 的訊息為「檔案超過 10MB 上限。」，清單仍是 7 張

#### Scenario: 格式不支援

- **WHEN** 使用者上傳不支援的檔案格式
- **THEN** 彈窗顯示「不支援的檔案格式，請使用 jpg／png／webp。」，清單項目數不變

##### Example: 拖放 PDF

- **GIVEN** 清單有 7 張素材
- **WHEN** 拖放 `doc.pdf` 到彈窗
- **THEN** `role="alert"` 的訊息為「不支援的檔案格式，請使用 jpg／png／webp。」，清單仍是 7 張

#### Scenario: 失敗後可以再試一次

- **WHEN** 上傳失敗後使用者再選一張合格的圖片
- **THEN** 錯誤訊息消失，新圖置頂並被選取

##### Example: 先失敗再成功

- **GIVEN** 上傳 `doc.pdf` 失敗、畫面顯示格式錯誤訊息
- **WHEN** 再上傳 `shirt.png`
- **THEN** 錯誤訊息消失，`shirt.png` 在格線第二格且已選取
