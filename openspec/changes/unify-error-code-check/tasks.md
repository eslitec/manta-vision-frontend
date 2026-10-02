## 1. 統一實作

- [x] 1.1 對齊 Requirement「錯誤碼判斷 SHALL 同時認得 ApiError 與 Error(CODE)」，落實設計決策「決策 1：以 api/errors.ts 的 hasErrorCode 為唯一實作」與「決策 4：ApiError 只比 code，不退回比 message」：`src/api/errors.ts` 的 `hasErrorCode` 改為 ApiError 比 `code`、其他 `Error` 比 `message`，介面依「決策 2：介面維持 `(error: unknown, code: ApiErrorCode)`，不放寬成 string」不變；驗證：`npx vitest run src/api/errors.spec.ts` 綠，`ALREADY_SAVED` 與 `CONSENT_REQUIRED` 的 `Error(CODE)` 形狀都判到；cp 快照把 `message` 比對改回 `return false` 時轉紅、還原後轉綠
- [x] 1.2 對齊 Requirement「錯誤碼判斷 SHALL 只有一份實作」，落實設計決策「決策 3：刪除 hasCode，不留 re-export」：刪除 `src/utils/error.ts` 的 `hasCode`，8 個 `isXxx` 捷徑改呼叫 `hasErrorCode`；`src/components/ImageEditorWorkspace.vue` 3 處 `hasCode` 改 `hasErrorCode`；驗證：`grep -rn "hasCode" src` 0 筆、`grep -rn "export function hasErrorCode" src` 1 筆

## 2. 驗證

- [x] 2.1 全面閘門：`npx vitest run` 全綠、`npx vue-tsc --noEmit` exit 0、`npm run lint` exit 0、`npx prettier --check` 改動檔全過
