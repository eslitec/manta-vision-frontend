## Why

後端 `docs/api-status.md` 已經把 `GET /brand`（#31）、`PUT /brand`（#32）標成「✅ 可串」，
是目前 `src/api/real.ts` 唯一還沒接上的既有功能——身分驗證、圖庫／資料夾／內建素材都已經在
`library-real-backend` 完成串接。使用者直接要求「把剩下的 API 都串上」，這個 change 把品牌
設定這一塊補完。

跟 `library-real-backend` 當初「後端還沒實作、先做設計定案」的情況不同，這裡後端端點已經
就緒，屬於直接對照後端原始碼刻程式碼的串接工作，走的也是同一套「先實作、事後補 ingest」
路徑（同 `library-real-backend` tasks.md 第 4 節記錄的模式），不另外開 `discuss` 階段。

串接過程發現三處前後端形狀對不上，這裡先講清楚決策，避免之後誤以為是程式碼寫錯：

- **`avoidWords`**：前端是單一字串（一個 textarea），後端是陣列。決定用「、」全形頓號
  join／split，這是畫面上原本呈現「不要出現的字詞」慣用的分隔方式。
- **`colors`**：前端可以透過「＋新增」無限新增色票，後端只有 `primary`／`secondary`／
  `accent` 三個具名欄位。決定固定用陣列前 3 個索引對應這三個欄位——**第 4 個以後的自訂
  色票不會存到真後端**，重新整理後會消失。這是已知限制，不在這次一併解決（UI 本身沒有
  阻止使用者新增第 4 個色票，屬於後續可以再處理的落差）。
- **Logo**：前端只會把選取的檔案轉成本機 `data:` URL 預覽，從沒有真的上傳過。後端要求
  「先 `POST /upload` 拿 `imageId`，`PUT /brand` 時用 `logoImageId` 引用它」兩段式流程。
  決定在 `saveBrand()` 存檔當下偵測 `logoUrl` 是不是 `data:` URL，是的話才補上傳這一步。

另外發現一個既有落差：合規頁「肖像權同意條款」「圖片授權聲明」這兩個 textarea 原本是
`BrandSettingsView.vue` 裡孤立的本地 `ref`（`portraitConsent`／`imageLicense`），從來
沒有被包進 `onSave()`，使用者填了也不會存檔。後端的 `portraitConsentTemplate`／
`imageLicense` 兩個欄位其實已經支援這兩筆資料，這次一併把它們併進 `BrandProfile`
正式欄位，讓合規頁四個欄位（含品牌名稱、定位語等）行為一致：填了會真的存起來。

## What Changes

- `src/types/api.ts`：`BrandProfile` 新增 `portraitConsent`／`imageLicense` 兩個必填字串欄位。
- `src/api/real.ts`：新增 `getBrand()`／`saveBrand()`，含 `WireBrand` 型別對應、三態 PUT
  語意（不帶 key＝不動、`null`／`[]`＝明確清空、有值＝設定；`name`／`positioning`／
  `industry` 三個必填欄位一律送值，不接受清空，交由後端 422 擋）、色票固定三欄位對應、
  avoidWords 陣列↔字串轉換、Logo 兩段式上傳的偵測與呼叫。`saveBrand()` 改回傳存檔後的
  完整內容（不再是 `void`）。
- `src/api/mock.ts`：`db.brand` 補上兩個新欄位（比照 `zh-Hant.ts` 的預設文案），
  `saveBrand()` 回傳型別與行為比照 `real.ts` 調整，維持假／真後端介面一致。
- `src/stores/brand.ts`：`load()` 時若後端回傳的合規欄位是空的，補上跟畫面一致的
  i18n 預設文案（`i18n.global.t()`，precedent 見 `router/index.ts`）；`save()` 改成
  用 `saveBrand()` 的回傳值覆蓋本地 `profile`——這是必要的，否則 Logo 換成真正的 R2
  網址後，下一次存檔仍會偵測到舊的 `data:` URL 而重複上傳同一張圖。
- `src/views/BrandSettingsView.vue`：合規頁兩個 textarea 改綁 `profile.portraitConsent`／
  `profile.imageLicense`，移除原本孤立、從不存檔的本地 `ref`。
- 測試：`real.spec.ts` 新增「品牌設定（brand）」整組測試（GET 映射含 null 正規化、PUT 三態
  語意、Logo 上傳前置動作、色票索引對應）；`stores.spec.ts` 更新「save 期間切換 saving
  狀態」測試以驗證 `profile` 會被回傳值覆蓋。

## Capabilities

### Modified Capabilities

- `brand-settings-ui`：「提供合規與授權資訊」這個 Requirement 底下，補上「填寫的內容會
  被存檔」這個先前程式碼沒有真正做到、也沒有被 spec 明確要求過的行為說明；四個 Requirement
  的 @trace code 清單加上 src/api/real.ts。

## Impact

- `openspec/specs/brand-settings-ui/spec.md`（直接套用，非透過 delta——比照
  `library-real-backend` tasks.md 第 4 節「事後 ingest」的做法，因為串接前就已經有正式
  spec，這次只是更新 trace 與補一句行為說明，不是新定案）
- `src/types/api.ts`、`src/api/real.ts`、`src/api/mock.ts`、`src/stores/brand.ts`、
  `src/views/BrandSettingsView.vue`、`src/api/real.spec.ts`、`src/stores/stores.spec.ts`
