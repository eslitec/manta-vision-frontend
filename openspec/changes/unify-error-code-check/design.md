## Context

盤點（分支 `chore/unify-reset-errors`，基準 `aed09ea`）：

| 函式                                      | 位置                 | 認得的形狀                                            | 呼叫                                                                                            |
| ----------------------------------------- | -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `hasCode(e, code: string)`                | `src/utils/error.ts` | ApiError（比 `code`）＋ `Error(CODE)`（比 `message`） | 2 檔 11 處：`utils/error.ts` 8 個 `isXxx` 捷徑、`ImageEditorWorkspace.vue` 3 處 CROP_* 純前端碼 |
| `hasErrorCode(error, code: ApiErrorCode)` | `src/api/errors.ts`  | 只認 ApiError                                         | 9 檔 21 處（含 `api/index.ts` re-export、`http.spec.ts`、`real.spec.ts`）                       |

`mock.ts` 一律 `throw new Error('<CODE>')`；`real.ts`／`http.ts` 一律丟 `ApiError`（`message` 是後端給人看的文案）。`ApiErrorCode` 型別本來就含 `(string & {})`，所以純前端碼（例如 `CROP_NO_SOURCE_IMAGE`）也能傳。

## Goals / Non-Goals

**Goals:**

- 只留一份錯誤碼判斷，兩種形狀都認，呼叫端切換真／假後端不必改。

**Non-Goals:**

- 不動 `isSessionInvalid`、`real.ts` 的 `isSettledFailure`（只對 ApiError 有意義，見 proposal）。

## Decisions

### 決策 1：以 api/errors.ts 的 hasErrorCode 為唯一實作

`hasErrorCode` 的呼叫端多（21 處 vs 11 處），已由 `src/api/index.ts` 對外 re-export，型別也已是 `ApiErrorCode`。把它的實作換成「ApiError 比 `code`，否則 `Error` 比 `message`」，現有 21 處呼叫不必改一個字；`hasCode` 的 11 處只要改名。反方向（保留 `hasCode`）要改 21 處且會讓 `api/` 層反向依賴 `utils/`。

### 決策 2：介面維持 `(error: unknown, code: ApiErrorCode)`，不放寬成 string

`ApiErrorCode` 已含 `(string & {})`，純前端碼照樣能傳，同時保留碼表自動完成；型別沒有放寬。

### 決策 3：刪除 hasCode，不留 re-export

只有 `ImageEditorWorkspace.vue` 一個外部呼叫端，直接改用 `hasErrorCode`；留 re-export 等於保留兩個名字，下一個人還是不知道該用哪個。`utils/error.ts` 的 `isXxx` 捷徑與 `displayMessage` 保留，捷徑內部改呼叫 `hasErrorCode`。

### 決策 4：ApiError 只比 code，不退回比 message

ApiError 的 `message` 是後端文案，剛好等於某個碼也不算命中；否則後端改文案就可能誤判。

## Risks / Trade-offs

- [既有只認 ApiError 的呼叫端開始認 `Error(CODE)`] → 真後端路徑（`real.ts`、`http.ts`）丟的都是 ApiError，axios 的原生錯誤訊息（例如 `Network Error`）不等於任何碼，不會誤判；受影響的只有假後端，而那正是要修的行為。
