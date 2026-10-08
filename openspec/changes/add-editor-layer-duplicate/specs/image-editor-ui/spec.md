## ADDED Requirements

### Requirement: 圖層清單可依選取圖層型別複製物件圖層

圖層清單面板標題列的「+」按鈕 SHALL 依目前選取的圖層決定啟用或停用：未選取任何圖層時 SHALL 停用；選取的圖層為 `'original'` 圖層時 SHALL 停用；選取的圖層為 `'text'` 圖層時 SHALL 停用；選取的圖層為 `'object'` 圖層時 SHALL 啟用。按鈕啟用且被點擊時，SHALL 建立一個新的物件圖層，其 `label`、`x`、`y`、`scale`、`visible`、`locked` 屬性 SHALL 與被複製的來源圖層相同，`dragging` 屬性 SHALL 為 `false`；新圖層 SHALL 被指定一個全新且唯一的 `key`，SHALL NOT 與來源圖層或任何既有圖層的 `key` 重複；新圖層 SHALL 以與既有「加入物件」流程相同的方式插入圖層清單最前面；複製完成後，新圖層 SHALL 成為目前選取的圖層。此按鈕的 `aria-label` SHALL 描述複製動作本身，SHALL NOT 沿用圖層清單面板標題的文字。

#### Scenario: 未選取任何圖層時複製按鈕停用

- **WHEN** 使用者尚未選取任何圖層
- **THEN** 圖層清單標題列的「+」按鈕 SHALL 呈現停用狀態，點擊無效果

#### Scenario: 選取原圖圖層時複製按鈕停用

- **WHEN** 使用者選取 `'original'` 圖層
- **THEN** 圖層清單標題列的「+」按鈕 SHALL 呈現停用狀態，點擊無效果

#### Scenario: 選取文字圖層時複製按鈕停用

- **WHEN** 使用者選取 `'text'` 圖層
- **THEN** 圖層清單標題列的「+」按鈕 SHALL 呈現停用狀態，點擊無效果

#### Scenario: 選取物件圖層時複製按鈕啟用並建立拷貝

- **WHEN** 使用者選取一個 `'object'` 圖層並點擊圖層清單標題列的「+」按鈕
- **THEN** 圖層清單新增一筆物件圖層，`label`／`x`／`y`／`scale`／`visible`／`locked` 與來源圖層相同、`dragging` 為 `false`、`key` 為全新且唯一，新圖層插入清單最前面並成為目前選取的圖層

##### Example: 複製一個位置已調整過的物件圖層

- **GIVEN** 圖層清單中存在一個物件圖層 `{ key: 'object-abc', type: 'object', visible: true, locked: false, label: '花束', x: 60, y: 40, scale: 1.2, dragging: false }`，且目前選取的圖層即為 `object-abc`
- **WHEN** 使用者點擊圖層清單標題列的「+」按鈕
- **THEN** 圖層清單最前面新增一筆 `{ key: '<新的 uuid>', type: 'object', visible: true, locked: false, label: '花束', x: 60, y: 40, scale: 1.2, dragging: false }`（`key` 不等於 `object-abc`），且目前選取的圖層變成這筆新圖層

#### Scenario: 複製按鈕的 aria-label 描述複製動作

- **WHEN** 使用者以螢幕報讀器聚焦到圖層清單標題列的「+」按鈕
- **THEN** 該按鈕的 `aria-label` SHALL 為描述「複製圖層」動作的文字（i18n key `editor.duplicateLayer`），SHALL NOT 為圖層清單面板標題文字（i18n key `editor.layers`）
