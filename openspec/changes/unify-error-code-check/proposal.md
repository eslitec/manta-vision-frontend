## Why

前端有兩個判斷錯誤碼的函式：`src/utils/error.ts` 的 `hasCode(e, code)`（ApiError 與 `Error(CODE)` 都認）與 `src/api/errors.ts` 的 `hasErrorCode(error, code)`（只認 ApiError）。假後端（`src/api/mock.ts`）丟的是 `new Error(CODE)`，所以用 `hasErrorCode` 的頁面（圖生圖、行銷 PO 文、試穿的 `ALREADY_SAVED`，試穿的 `CONSENT_REQUIRED`）在假後端下判斷不到，兩份實作也讓新程式碼不知道該用哪一個。

## What Changes

- `src/api/errors.ts` 的 `hasErrorCode` 成為唯一的錯誤碼判斷：ApiError 比 `code`，其他 `Error` 比 `message`。
- 刪除 `src/utils/error.ts` 的 `hasCode`，該檔的 `isInsufficientFeed` 等具名捷徑改呼叫 `hasErrorCode`。
- `src/components/ImageEditorWorkspace.vue` 的三處 `hasCode` 改用 `hasErrorCode`。
- 新增 `src/api/errors.spec.ts` 證明兩種錯誤形狀都判得到。

## Non-Goals

- 不改 `isSessionInvalid`：token 失效碼只會由真後端的 401 帶回來，假後端不會丟。
- 不改 `real.ts` 的 `isSettledFailure`：它同時看 HTTP status，只對 ApiError 有意義。
- 不新增或改名任何錯誤碼，不動 `displayMessage`。

## Capabilities

### New Capabilities

- `error-code-check`: 前端判斷錯誤碼的單一入口，同時涵蓋真後端 ApiError 與假後端／純前端的 `Error(CODE)`。

### Modified Capabilities

(none)

## Impact

- Affected specs: error-code-check（新增）
- Affected code:
  - New: src/api/errors.spec.ts
  - Modified: src/api/errors.ts, src/utils/error.ts, src/components/ImageEditorWorkspace.vue
  - Removed: (none)
