## 背景

這份文件記錄圖庫（`library-management-ui`）要接上真後端之前，需要先定案的資料模型與行為決策。
目標讀者是「後端開始寫圖庫端點的工程師」與「之後接手串接的前端工程師」——兩邊都可以只看這份
文件就知道最終要對齊的形狀，不用回頭翻對話紀錄或猜測。

現況依據：後端 `docs/api.md`（`GET/POST/PUT/DELETE /images`、`GET/POST/PUT/DELETE /folders`）與
前端目前的 `src/composables/useAssets.ts`、`src/api/mock.ts`、`src/types/asset.ts`、
`src/views/LibraryView.vue`（分頁邏輯）、`openspec/specs/library-management-ui/spec.md`。

---

## 決策 1：資料夾改成物件形狀，「未分類」用 unfiledCount 組裝

**現況**：`useAssets.ts` 的 `folders` 是 `ref<string[]>([])`，`mock.ts` 的 `db.folders` 是
`['未分類', '春季企劃', '商品素材', '生成結果']`——名字本身就是識別碼，「未分類」是陣列裡的
普通一員。

**後端形狀**：`GET /folders` 回傳 `{ items: [{ folderId, name, isSystem, imageCount }],
unfiledCount }`。「未分類」不在 `items` 裡，是獨立欄位；`items` 裡也沒有「未分類」這個特例。

**決策**：前端資料夾型別改成

```ts
interface Folder {
  folderId: string // 後端 uuid；「未分類」沒有 folderId，是前端組裝時的虛擬項目
  name: string
  imageCount: number
}
```

左側欄組裝規則：`[{ folderId: undefined, name: '未分類', imageCount: unfiledCount }, ...items]`——
「未分類」固定置頂，這一點延續現有 UI 行為（`sync-mv-01-design` 已定案），只是資料來源從
「陣列裡的一員」改成「後端的獨立欄位＋前端組裝」。素材的 `folderId` 欄位維持 1:1（見決策 4），
「未分類」在素材端就是 `folderId` 為 `null`／未設定，不是某個真實的 folderId 值。

**影響範圍**：`useAssets.ts`（`folders` 型別與 `loadFolders`）、`mock.ts`（`db.folders` 改成物件
陣列、`listFolders`／`createFolder` 回傳形狀）、`FolderRow.vue`、`LibraryView.vue`（左側欄組裝、
`ImagePickerDialog.vue` 同步）、`types/asset.ts`。

---

## 決策 2：分頁改成後端驅動，頁碼變動要重新請求

**現況**：`LibraryView.vue` 用 `pageSize = 8` 的本地常數，`paged = filtered.value.slice(...)` 對
「已經整包載入記憶體」的 `assets` 陣列做切片；`useAssets.ts` 的 `load()` 呼叫 `api.listImages()`
不帶任何參數，一次拿全部。

**後端形狀**：`GET /images` 支援 `page`／`pageSize`（預設 1／24），回傳
`{ total, page, pageSize, items, counts }`；`counts` 是不受篩選影響的全庫統計，獨立於目前的
`page`。

**決策**：
- 前端頁面呈現的 `pageSize` 維持 `8`（既有設計稿的格線是 8 張一頁，不因為後端預設 24 而改版面），
  串接時明確帶 `pageSize=8` 這個查詢參數，不依賴後端預設值。
- 換頁（`page` 變動）SHALL 觸發新的 `GET /images` 請求，不能再假設資料已經在記憶體裡就地切片。
  這是一個**可觀察的行為改變**：現在切頁是純本地、零延遲；串接後每次切頁會有網路延遲，需要在
  按鈕上加 loading 狀態（沿用現有的 `IconLoader.vue`），避免使用者以為點擊沒反應。
- `total` 與 `counts`（左側欄「全部素材」「系統分類」的數字）一律採信後端回傳值，前端不再用
  `assets.value.length` 或本地陣列現算——目前 `useAssets.ts` 與 `LibraryView.vue` 好幾處都是
  「本地 filter 完再 `.length`」，串接時要全部改成讀後端回傳的 `counts` 物件。
- 篩選條件（資料夾／系統分類／來源／關鍵字）變動時要回到第 1 頁並重新請求——這點延續現有 spec
  的既定行為（見 `library-management-ui` 現有 Requirement「素材清單分頁顯示」），不用改 spec，
  只是資料來源從本地重算變成重新打 API。

**影響範圍**：`useAssets.ts`（`load()` 簽章要能接受 `page`／`filters`）、`mock.ts`
（`listImages` 要能接受並套用分頁／篩選參數，回傳形狀改成 `{ total, page, pageSize, items,
counts }`）、`LibraryView.vue`（拿掉本地 `paged`／`filtered` 的切片邏輯，改成直接顯示
`useAssets` 回傳的當頁資料，換頁時呼叫 `load`）。

---

## 決策 3：批次操作改成逐筆呼叫＋彙總，支援部分成功

**現況**：`useAssets.ts` 的 `deleteAssets`／`moveToFolder`／`removeFromFolder` 都是把整組
`assetIds` 一次傳給 `mock.ts` 對應函式，`mock.ts` 內部用 `for...of` 迴圈一次處理完，永遠是
「全部成功」或（目前根本沒有失敗路徑）。刪除確認彈窗（`library-management-ui` 現有 Requirement
「批次刪除素材需要明確確認」）唯一的守門是使用者勾選「我了解此操作無法復原」，沒有任何素材
「正被使用中不能刪」的概念。

**後端形狀**：只有單筆 `DELETE /images/{id}`／`PUT /images/{id}`，「批次由前端逐筆呼叫」是
既定規則；`DELETE` 會在素材 `isInUse=true`（被生成紀錄引用）時擋下，回 400 `ASSET_IN_USE`。

**決策**：
- `useAssets.ts` 的批次函式改成「對每個 id 各自呼叫單筆端點，用 `Promise.allSettled` 收集結果」，
  不是單一個 API 呼叫。
- 刪除彙總規則：成功的照樣從本地清單移除；被 `ASSET_IN_USE` 擋下的維持存在，並回傳一份
  「哪些 id 因為使用中被跳過」的清單給呼叫端。
- 刪除確認彈窗新增「部分成功」結果狀態：彈窗關閉後若有素材被跳過，要用 toast 或彈窗告知
  「N 筆已刪除、M 筆使用中略過」，不能悄悄地少刪幾筆卻讓使用者以為全刪成功。
- 移至資料夾／移出資料夾目前沒有會失敗的業務規則（後端沒有對應的擋下條件），批次彙總結構
  比照刪除做（統一用同一個 `BatchResult { succeededIds, failedIds }` 形狀），但預期
  `failedIds` 在這兩個操作上大多數情況會是空陣列——先做成一致的形狀，之後後端如果加了新的
  擋下規則（例如資料夾已刪除）不用重新設計彙總邏輯。
- 現有 `Asset.referencedBy?: number`（生成紀錄引用計數，用於卡片上顯示「被幾個生成引用」）
  跟後端的 `isInUse: boolean`（純粹是否可刪除的旗標）是兩個不同用途的欄位，不要合併成一個：
  `isInUse` 決定刪除彙總邏輯，`referencedBy` 的計數顯示能力目前的 33 支端點契約沒有提供，
  暫時維持前端自己算不到就不顯示，不是這次要解決的範圍。

**影響範圍**：`useAssets.ts`（三個批次函式改簽章與回傳型別）、`mock.ts`（改成逐筆處理＋模擬
`isInUse` 擋下，讓前端邏輯在真後端上線前就能被測試涵蓋）、`LibraryView.vue`（刪除確認彈窗與
批次操作列的結果呈現）、`SaveAssetDialog.vue`／相關彈窗如果有讀 `referencedBy` 需要確認不受影響。

---

## 決策 4：修正 spec 文件「素材可同時屬於多個資料夾」的錯誤描述

**現況確認**：`types/asset.ts` 對 `folderId` 的型別註解寫的是「1:N；一張素材只屬於一個資料夾」，
`mock.ts` 的 `moveToFolder` 實作是直接賦值取代（`a.folderId = folder`），兩者都是單一資料夾歸屬，
跟後端 `PUT /images/{id}` 的「移至＝換 folderId（離開原夾）」完全一致。**唯一寫錯的是
`library-management-ui` 現有 spec 文件裡的兩句話**：「批次移動素材到資料夾」Requirement 寫
「素材可同時屬於多個資料夾」，「批次移出資料夾」Requirement 寫「素材本身與其他資料夾歸屬不受
影響」——這兩句話暗示多對多，但程式碼從一開始就是一對一，是文件寫錯、不是這次才決定要改的行為。

**決策**：這次的 spec delta 直接修正這兩句話，改成跟程式碼一致的 1:1 描述：移至資料夾＝取代
原本的 `folderId`（離開原資料夾）；移出資料夾＝`folderId` 設回未分類（也是取代，不是移除某個
多對多關聯）。這個修正不影響任何現有程式碼或使用者體感——UI 上「移至」「移出」的操作結果本來
就是這樣，只是文件現在才寫對。

---

## 開放問題（本 change 不代為決定）

### A. 素材物件要不要補寬高欄位

`#4/#5/#6/#13`（`GET /images`、卡片顯示、`PUT /images/{id}`、存入圖庫）共用的素材物件目前沒有
寬高欄位，但圖庫卡片本來就要顯示尺寸（現有 `Asset.dim` 欄位）。兩個選項：
1. 後端補 `width`／`height` 欄位到素材物件（可能需要為既有資料做回填）。
2. 前端自己在圖片載入完成時用 `Image.naturalWidth`／`naturalHeight` 量測，不依賴後端欄位。

這個決定會影響 `Asset` 型別跟 `AssetCard.vue` 的實作方式，需要後端明確答覆才能定案，**不是
前端能單方面決定的事**——已列入契約報告「最該先改的契約」第 3 項，等後端回覆後再回來更新這份
文件與對應的 spec delta。

### B. `source`／`tag` 五值對齊

後端素材物件的 `source` 欄位是五個固定值：`upload`／`aiGenerate`／`edit`／`object`／`tryon`；
前端 `types/asset.ts` 的 `AssetTag` 是 `'upload' | 'object' | 'ai' | 'edit' | 'video'`——不只
命名不同（`ai` vs `aiGenerate`），語意也不同：後端用 `mediaType`（`image`/`video`）跟 `source`
是兩個獨立維度（一支影片的 `source` 可能是 `aiGenerate`），前端目前把「是不是影片」直接編碼進
`tag` 本身（`video` 是 tag 的其中一值，不是獨立欄位）。這也牽動決策 2 提到的「系統分類」
（`CATEGORY_TAGS`）計數要怎麼對應後端的 `counts` 物件（`{ all, upload, aiGenerate, edit,
object, video }`）——目前前端的分類跟後端的 `counts` 鍵值兜不起來，需要先把 `source`／`tag`
的對應關係定案，「系統分類」的計數邏輯才能重寫。

這一項也需要跟後端確認語意是否真的一一對應（契約報告「最該先改的契約」第 6/8 項是類似性質的
命名對齊問題）——如果對應，前端把 `AssetTag` 拆成 `mediaType` ＋ `source` 兩個欄位、改名配合
後端即可；如果語意不同，需要重新設計圖庫的分類 UI，範疇會更大，需要另外評估。

---

## 非目標

- 不實作任何 `src/` 程式碼（本 change 只有 spec 文件修正）。
- 不決定開放問題 A／B 的答案——這是要往上（後端／設計）問的問題，不是前端關起門能決定的事。
- 不涵蓋圖庫以外的頁面（`GenerateImageView.vue`／`TryOnView.vue` 等「從圖庫選擇」彈窗
  `ImagePickerDialog.vue` 只在資料形狀改變時同步受影響，其餘生成邏輯不在範疇內）。
