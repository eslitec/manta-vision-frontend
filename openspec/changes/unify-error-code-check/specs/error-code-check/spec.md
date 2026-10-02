## Purpose

前端判斷錯誤碼的單一入口：不論錯誤來自真後端（`ApiError`）或假後端與純前端（`Error(CODE)`），呼叫端都用同一個函式判斷，切換資料來源時不必改程式。

## ADDED Requirements

### Requirement: 錯誤碼判斷 SHALL 只有一份實作

前端判斷「這個錯誤是不是某個錯誤碼」SHALL 一律呼叫 `src/api/errors.ts` 的 `hasErrorCode`；`src/` 內 SHALL NOT 存在第二個做同樣判斷的函式。`src/utils/error.ts` 的具名捷徑（例如 `isInsufficientFeed`）SHALL 透過 `hasErrorCode` 判斷。

#### Scenario: 具名捷徑走同一份判斷

- **WHEN** 呼叫 `isInsufficientFeed(e)`
- **THEN** 結果 SHALL 等於 `hasErrorCode(e, 'INSUFFICIENT_FEEDS')`

### Requirement: 錯誤碼判斷 SHALL 同時認得 ApiError 與 Error(CODE)

`hasErrorCode(error, code)` 對 `ApiError` SHALL 只比對 `code`；對其他 `Error` SHALL 比對 `message`；非 `Error` 的值 SHALL 回傳 false。

#### Scenario: 假後端形狀

- **WHEN** 假後端擲出 `new Error('ALREADY_SAVED')` 或 `new Error('CONSENT_REQUIRED')`
- **THEN** `hasErrorCode(e, <同一個碼>)` SHALL 回傳 true

#### Scenario: 真後端形狀不看文案

- **WHEN** `ApiError` 的 `code` 是 `NOT_FOUND`、`message` 剛好是 `ALREADY_SAVED`
- **THEN** `hasErrorCode(e, 'ALREADY_SAVED')` SHALL 回傳 false
