## Purpose

定義圖生圖頁（MV-02）接上真後端後的行為；本 change 只改「參考圖為選填」這一項，其餘沿用 generation-real-backend 的 delta。

## RENAMED Requirements

- FROM: `### Requirement: 圖生圖請求以參考圖為必要條件並使用後端欄位`
- TO: `### Requirement: 圖生圖請求以參考圖為選填並使用後端欄位`

## MODIFIED Requirements

### Requirement: 圖生圖請求以參考圖為選填並使用後端欄位

「生成圖片」按鈕 SHALL 在沒有描述（去掉前後空白後為空）或生成中時停用；沒有參考圖 SHALL NOT 停用（純文字生圖）。送出的 `GenerateImageReq` SHALL 直接使用後端 `GenerateRequest` 的欄位名：`modelKey`、`imageId`（參考圖的素材 id，選填）、`prompt`、`count`、`strength`、`negativePrompt`、`seed`、`useBrand`、`regenOf`。有參考圖時 `strength` SHALL 是 `1 − 參考強度滑桿值`（四捨五入到小數兩位），因為畫面上越高越貼近參考圖、後端越低越貼近；沒有參考圖時 SHALL NOT 送出 `imageId` 與 `strength`。`negativePrompt` 去掉前後空白後為空字串時 SHALL 省略；種子欄位清空時 SHALL 省略 `seed`，填 0 時 SHALL 送出 `seed: 0`；種子不是 0 以上的整數（負數、小數）時 SHALL NOT 送出，錯誤區 SHALL 顯示「種子要填 0 以上的整數，或留空改用隨機。」；`useBrand` SHALL 等於品牌開關的狀態。

#### Scenario: 沒有參考圖也能生成

- **WHEN** 使用者輸入描述但尚未選參考圖
- **THEN** 「生成圖片」按鈕為可用狀態；按下後 `POST /generate` 的 body 不含 `imageId` 與 `strength`

#### Scenario: 請求欄位

- **WHEN** 使用者選了參考圖 `img_1`、標準檔、2 張、參考強度 0.7、種子 0、品牌開關開啟，按下生成
- **THEN** `POST /generate` 的 body 是 `{ modelKey: 'imageStandard', imageId: 'img_1', prompt, count: 2, strength: 0.3, seed: 0, useBrand: true }`

#### Scenario: 重新生成用當下的參考圖

- **WHEN** 使用者選圖生成後移除參考圖，再對某筆結果按「重新生成」
- **THEN** `POST /generate` 的 body 帶 `regenOf` 但不含 `imageId` 與 `strength`（後端不沿用原生成那張）

##### Example: seed 與 negativePrompt 的轉換

| 種子欄位  | 排除元素欄位 | 送出的 seed | 送出的 negativePrompt |
| --------- | ------------ | ----------- | --------------------- |
| 清空      | 空白         | 省略        | 省略                  |
| 0         | 「 模糊 」   | 0           | 「模糊」              |
| 42        | 「文字」     | 42          | 「文字」              |
| -1 或 1.5 | 任意         | 不送出      | 不送出                |
