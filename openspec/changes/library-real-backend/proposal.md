## Why

`auth-real-backend` 把登入／註冊／登出接上真後端之後，圖庫（MV-01，`library-management-ui`）
是使用率最高、也是落差最大的下一塊——首頁、圖生圖、圖生影、AI 試穿全部都要靠圖庫選圖／存圖，
但目前圖庫整套（`useAssets.ts`／`mock.ts`／`LibraryView.vue`／`FolderRow.vue`）都是照著最早期的
假設寫的，跟後端 `docs/api.md` 定案的圖庫端點（`GET/POST/PUT/DELETE /images`、`GET/POST/PUT/DELETE
/folders`）在資料形狀與操作語意上有多處對不上：

- **資料夾不是物件**：前端 `folders` 是純字串陣列（`['未分類', '春季企劃', ...]`），後端是
  `{ folderId, name, isSystem, imageCount }` 物件陣列，「未分類」不在陣列裡、是獨立的
  `unfiledCount`。
- **沒有真分頁**：`GET /images` 後端預設一頁 24 筆，前端目前是把全部素材一次載入記憶體、
  分頁只是本地陣列切片——超過 24 筆的素材、分類計數、資料夾計數會安靜地消失，不會報錯。
- **批次操作的語意不同**：後端只有單筆 `DELETE /images/{id}`／`PUT /images/{id}`，「批次」規則
  是前端逐筆呼叫；後端會用 `isInUse` 擋下正被使用中的素材（400 `ASSET_IN_USE`），前端目前的
  批次刪除／移動完全沒有「部分成功」這個概念，也沒有 `isInUse` 檢查。
- **既有 spec 文件本身有矛盾**：`library-management-ui` 現有 spec 寫「素材可同時屬於多個資料夾」，
  但 `types/asset.ts` 的型別註解與 `mock.ts` 的實際實作都是 1:1（`folderId` 單一值、換資料夾＝
  取代舊值）——程式碼本身是對的、跟後端模型一致，是 spec 文件的描述寫錯了，需要在這次一併修正，
  不是這次才決定要改的行為。
- **素材物件缺寬高欄位**：圖庫卡片本來就要顯示尺寸，但後端素材物件目前沒有寬高欄位——這是需要
  後端決定的事（補欄位，或前端自己用圖片載入量測），本 change 只記錄成待後端答覆的開放問題，
  不代這個決定。

後端圖庫相關端點目前都還沒實作（`docs/api.md` 33 支端點只有 auth 三支與 `GET /bots` 是真的），
**所以這個 change 現在還不能像 `auth-real-backend` 一樣直接切資料來源**。這個 change 的目的是先把
上面這些落差的設計決策定案、寫進 spec，讓後端動工時有明確的目標形狀可以對；等對應端點上線，
串接本身（改 `useAssets.ts`／`mock.ts` 呼叫真 API）會是一個範疇小很多、風險低很多的後續 change。

## What Changes

**這個 change 只處理設計與文件，不改動 `src/` 底下的程式行為**（例外：修正 spec 文件本身跟
現有程式碼矛盾的描述錯字，見下方 Modified Capabilities）。具體定案的決策：

- 資料夾模型改成跟後端一致的物件形狀（`folderId`／`name`／`isSystem`／`imageCount`），
  「未分類」以後端的 `unfiledCount` 組裝，不再是陣列裡的一個項目；UI 呈現（未分類永遠置頂）不變。
- 分頁改成由後端驅動：頁碼變動時前端要重新打 `GET /images` 帶 `page`／`pageSize`，不能再假設
  資料已經全部在記憶體裡；`total`／`counts` 一律採信後端回傳值，前端不再自行從本地陣列推算。
- 批次刪除／移動／移出改成「前端逐筆呼叫單筆端點＋彙總結果」，刪除新增「部分成功」路徑：
  被 `isInUse` 擋下的素材要能個別標示、其餘照樣刪除成功，不是全部卡住或整批悄悄跳過。
- 修正 `library-management-ui` spec 裡「素材可同時屬於多個資料夾」的錯誤描述，改成跟後端與現有
  程式碼一致的 1:1 模型（換資料夾＝取代原本的 `folderId`，離開原資料夾）。
- 記錄兩個目前無法自行定案、需要跟後端／設計對齊的開放問題（見 design.md「開放問題」）：
  素材寬高欄位、`source`／`tag` 五值對齊。

**不做**：任何 `src/` 程式碼改動、任何真後端串接、任何新 UI 設計稿。這些留給後端端點上線後的
下一個 change（暫定命名 `library-real-backend-wiring`）。

## Capabilities

### Modified Capabilities

- `library-management-ui`：修正資料夾多對多的錯誤描述為 1:1；批次刪除新增「部分成功（使用中
  素材被擋）」情境；分頁 Requirement 補充「頁碼切換要重新向後端請求，不是本地切片」的行為說明。

## Impact

- `openspec/specs/library-management-ui/spec.md`（透過本 change 的 delta 套用）
- 本 change 自己的四個檔案：`proposal.md`／`design.md`／`tasks.md`／
  `specs/library-management-ui/spec.md`

**不影響**：`src/` 底下任何檔案（本 change 不動程式碼）；後端一行都沒改（圖庫端點本來就還沒實作）。
