# library-management-ui Specification

## Purpose

TBD - created by archiving change 'sync-mv-01-design'. Update Purpose after archive.

## Requirements

### Requirement: 頁面標示所屬機器人情境

圖庫管理中心 SHALL 顯示提示文字，說明目前圖庫隸屬於哪個機器人，切換機器人會顯示該機器人專屬的素材。

#### Scenario: 使用者進入圖庫管理中心

- **WHEN** 使用者導覽到圖庫頁面（`/library`）
- **THEN** 頁面頂端顯示目前所屬機器人的提示文字

<!-- @trace
source: sync-mv-01-design
updated: 2026-08-21
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 左側篩選分成全部素材、系統分類與我的資料夾三段

圖庫管理中心 SHALL 在左側顯示三段式篩選清單：「全部素材」（含總數）、「系統分類」（依素材類型分類，各自帶數量）、「我的資料夾」（使用者自訂資料夾，各自帶數量，可新增）；三者互斥、單選，使用者點選其中一項後，右側只顯示符合該篩選的素材。「我的資料夾」清單 SHALL 固定以「未分類」為第一個項目（帶未歸檔素材的數量），其餘為使用者自訂資料夾；「未分類」不是使用者建立的資料夾，是後端獨立回傳的未歸檔統計組裝而成的虛擬項目。

#### Scenario: 使用者切換到某個系統分類

- **WHEN** 使用者點擊左側「系統分類」下的某個項目（例如「AI 生成」）
- **THEN** 右側素材清單只顯示該類型的素材，且該項目在清單中標示為使用中

#### Scenario: 使用者切換到某個資料夾

- **WHEN** 使用者點擊左側「我的資料夾」下的某個資料夾
- **THEN** 右側素材清單只顯示屬於該資料夾的素材，頁面頂端提示文字改成顯示該資料夾的名稱與數量，且該資料夾在清單中標示為使用中

#### Scenario: 使用者切換到「未分類」

- **WHEN** 使用者點擊「我的資料夾」清單置頂的「未分類」項目
- **THEN** 右側素材清單只顯示尚未歸屬任何資料夾的素材，數量與「未分類」旁顯示的數字一致，且此項目在清單中標示為使用中

##### Example:

- GIVEN 圖庫共有 12 筆未歸檔素材
- WHEN 使用者點擊「我的資料夾」清單置頂的「未分類」（顯示數量 12）
- THEN 右側只顯示這 12 筆未歸檔素材，「移出資料夾」動作不出現在批次操作列（已經在未分類，沒有可移出的資料夾）

#### Scenario: 使用者新增資料夾

- **WHEN** 使用者點擊「我的資料夾」旁的新增按鈕並輸入名稱後確認
- **THEN** 新資料夾加入清單，且頁面自動切換到這個新資料夾

<!-- @trace
source: sync-mv-01-design, library-real-backend
updated: 2026-08-28
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/api/real.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 素材可依來源與關鍵字篩選

圖庫管理中心 SHALL 提供來源篩選（全部／上傳／AI 生成／編輯產物）與關鍵字搜尋，兩者可與資料夾篩選同時套用。

#### Scenario: 使用者篩選來源

- **WHEN** 使用者點選某個來源篩選項目
- **THEN** 素材清單只顯示符合該來源的素材，且與目前的資料夾篩選同時生效

#### Scenario: 使用者輸入搜尋關鍵字

- **WHEN** 使用者在搜尋欄輸入文字
- **THEN** 素材清單只顯示名稱包含該關鍵字的素材

#### Scenario: 沒有符合篩選條件的素材

- **WHEN** 目前的資料夾／來源／關鍵字篩選條件沒有任何素材符合
- **THEN** 素材清單區域顯示「沒有符合的素材」的空狀態提示

<!-- @trace
source: sync-mv-01-design
updated: 2026-08-21
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 使用者可上傳素材到圖庫

圖庫管理中心 SHALL 提供「上傳圖片」把素材加進圖庫；素材要歸到哪個資料夾，一律由批次選取後的「移至資料夾」處理，工具列不另外提供「從圖庫加入」的入口。

#### Scenario: 使用者上傳新素材

- **WHEN** 使用者透過上傳控制項選擇一或多個檔案
- **THEN** 每個檔案各自上傳，成功後併入素材清單

#### Scenario: 工具列不提供從圖庫加入的入口

- **WHEN** 使用者選取任一資料夾
- **THEN** 工具列只有「上傳圖片」一個加入素材的動作；要把既有素材歸入資料夾，改用批次選取後的「移至資料夾」

<!-- @trace
source: sync-mv-01-design
updated: 2026-08-21
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 每個素材卡片顯示型別與來源標籤

素材清單中的每個項目 SHALL 顯示縮圖（依素材型別區分影片／圖片）、名稱、來源標籤與尺寸資訊。

#### Scenario: 使用者檢視素材卡片

- **WHEN** 素材清單顯示任一素材
- **THEN** 該卡片顯示對應型別的縮圖圖示、名稱、來源標籤（依上傳／AI 生成／編輯產物／影片等分類呈現不同顏色）與尺寸文字

<!-- @trace
source: sync-mv-01-design
updated: 2026-08-21
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 使用者可批次選取素材並執行批次操作

每張素材卡片 SHALL 提供選取用的核取方塊；只要有任一素材被選取，畫面 SHALL 顯示批次操作列，列出已選數量、「全選本頁」「清除」，以及「移至資料夾」「移出資料夾」（僅在目前檢視某個資料夾時顯示）「下載」「刪除」動作。

#### Scenario: 使用者勾選素材

- **WHEN** 使用者勾選一或多張素材卡片
- **THEN** 批次操作列出現，顯示目前已選取的筆數

#### Scenario: 使用者全選本頁

- **WHEN** 使用者點擊「全選本頁」
- **THEN** 目前分頁頁面上顯示的所有素材都被加入選取，已選筆數更新

#### Scenario: 使用者清除選取

- **WHEN** 使用者點擊「清除」
- **THEN** 所有選取狀態被清空，批次操作列消失

#### Scenario: 切換篩選條件時選取自動清空

- **WHEN** 使用者在有素材被選取的狀態下切換資料夾／系統分類／來源篩選／關鍵字搜尋
- **THEN** 選取狀態被清空，避免使用者誤以為是針對新的篩選結果操作

<!-- @trace
source: sync-mv-01-design
updated: 2026-08-21
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 批次移動素材到資料夾

使用者選取一或多筆素材後點擊「移至資料夾」，SHALL 顯示彈窗列出所有資料夾（含數量）供選擇，
清單最後 SHALL 包含「未分類」這個虛擬選項（數量取 unfiledCount），並可在彈窗內就地建立新
資料夾；確認後，選取的素材改為歸屬指定資料夾。素材同一時間 SHALL 只屬於一個資料夾（未歸檔
即為「未分類」），移至新資料夾 SHALL NOT 保留原本的資料夾歸屬。

#### Scenario: 使用者移動素材到既有資料夾

- **WHEN** 使用者在「移至資料夾」彈窗選擇某個既有資料夾並確認
- **THEN** 選取的素材加入該資料夾，彈窗關閉，選取狀態清空，該資料夾的數量更新

##### Example:

- GIVEN 素材「門市外觀」目前屬於「未分類」
- WHEN 使用者選取「門市外觀」，在「移至資料夾」彈窗選擇既有資料夾「商品素材」並確認
- THEN 「門市外觀」的資料夾歸屬變成「商品素材」，「未分類」數量減少 1、「商品素材」數量增加 1

#### Scenario: 使用者就地建立新資料夾並移動

- **WHEN** 使用者在彈窗內輸入新資料夾名稱並建立
- **THEN** 新資料夾加入資料夾清單，並成為這次移動的目標

##### Example:

- GIVEN 使用者選取 2 筆素材，開啟「移至資料夾」彈窗
- WHEN 使用者輸入「夏季企劃」並點擊「建立」
- THEN 資料夾清單新增「夏季企劃」（數量 0），這 2 筆素材的目標資料夾自動設為「夏季企劃」

#### Scenario: 素材已經在某個資料夾，再次移動到別的資料夾

- **WHEN** 使用者選取一筆已經歸屬「春季企劃」的素材，將其移動到「商品素材」資料夾
- **THEN** 該素材的資料夾歸屬變成「商品素材」，「春季企劃」的數量減少 1、「商品素材」的數量增加 1，
  該素材 SHALL NOT 同時出現在兩個資料夾底下

##### Example:

- GIVEN 素材「春季主視覺_01」目前屬於「春季企劃」（該夾原有 5 筆）
- WHEN 使用者將它移動到「商品素材」（該夾原有 3 筆）
- THEN 「春季企劃」剩 4 筆、「商品素材」變成 4 筆，「春季主視覺_01」只出現在「商品素材」底下

#### Scenario: 使用者透過「移至資料夾」把素材移回未分類

- **WHEN** 使用者在「移至資料夾」彈窗選擇清單最後的「未分類」並確認
- **THEN** 選取的素材資料夾歸屬變成「未分類」（等同「移出資料夾」的結果），原資料夾數量減少，
  「未分類」數量增加

##### Example:

- GIVEN 素材「商品\_去背\_白T」目前屬於「商品素材」（該夾原有 2 筆），「未分類」原有 64 筆
- WHEN 使用者選取「商品\_去背\_白T」，在「移至資料夾」彈窗選擇「未分類」並確認
- THEN 「商品素材」剩 1 筆，「未分類」變成 65 筆，「商品\_去背\_白T」的資料夾歸屬變成「未分類」

<!-- @trace
source: sync-mv-01-design, library-real-backend, fix-library-dialog-figma-mismatch
updated: 2026-09-01
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/api/real.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 批次移出資料夾

當使用者目前檢視某個資料夾時，選取素材後點擊「移出資料夾」，SHALL 把選取的素材改為歸屬
「未分類」；素材本身 SHALL NOT 從圖庫中被刪除。

#### Scenario: 使用者把素材移出目前資料夾

- **WHEN** 使用者在檢視某個資料夾時選取素材並點擊「移出資料夾」
- **THEN** 這些素材的資料夾歸屬變成「未分類」，不再出現在原資料夾清單中，原資料夾的數量減少，
  「未分類」的數量增加，素材仍完整保留在圖庫中

##### Example:

- GIVEN 使用者正在檢視「商品素材」資料夾（目前 6 筆），選取其中 2 筆素材
- WHEN 使用者點擊「移出資料夾」
- THEN 「商品素材」剩 4 筆，這 2 筆素材的資料夾歸屬變成「未分類」，「未分類」數量增加 2，
  這 2 筆素材依然可以在「全部素材」中找到

<!-- @trace
source: sync-mv-01-design, library-real-backend
updated: 2026-08-28
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/api/real.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 批次刪除素材需要明確確認

使用者選取一或多筆素材後點擊「刪除」，SHALL 顯示確認彈窗列出選取素材的縮圖預覽，並要求使用者
勾選「我了解此操作無法復原」後才能執行刪除；刪除後素材從圖庫永久移除。選取範圍中若有素材正被
使用中而無法刪除，SHALL 允許其餘素材照常刪除成功，SHALL NOT 因為部分素材無法刪除就讓整批操作
失敗，也 SHALL NOT 悄悄跳過而不告知使用者。

#### Scenario: 使用者未勾選確認前無法刪除

- **WHEN** 刪除確認彈窗開啟，使用者尚未勾選「我了解此操作無法復原」
- **THEN** 「永久刪除」按鈕維持停用狀態

##### Example:

- GIVEN 使用者選取 3 筆素材並開啟刪除確認彈窗
- WHEN 使用者尚未勾選「我了解此操作無法復原」
- THEN 「永久刪除」按鈕顯示為停用（disabled）狀態，點擊無反應

#### Scenario: 使用者確認後執行刪除

- **WHEN** 使用者勾選確認並點擊「永久刪除」
- **THEN** 選取的素材從圖庫移除，彈窗關閉，選取狀態清空，總數與分頁筆數更新

##### Example:

- GIVEN 使用者選取 3 筆素材，均未被任何生成紀錄引用，並已勾選確認
- WHEN 使用者點擊「永久刪除」
- THEN 這 3 筆素材從圖庫移除，彈窗關閉，「全部素材」總數減少 3

#### Scenario: 部分素材因為使用中而無法刪除

- **WHEN** 使用者確認並點擊「永久刪除」，選取範圍中有部分素材正被生成紀錄引用（使用中）
- **THEN** 未被使用的素材成功刪除，使用中的素材維持存在於圖庫，彈窗關閉後顯示「N 筆已刪除、
  M 筆使用中，未刪除」的訊息

##### Example:

- GIVEN 使用者選取 5 筆素材，其中「商品\_去背\_白T」與「商品\_去背\_帆布袋」正被生成紀錄引用
- WHEN 使用者勾選確認並點擊「永久刪除」
- THEN 其餘 3 筆成功刪除，這 2 筆維持存在，畫面顯示「3 筆已刪除、2 筆使用中，未刪除」

<!-- @trace
source: sync-mv-01-design, library-real-backend, fix-library-dialog-figma-mismatch
updated: 2026-09-01
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/api/real.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->

---

### Requirement: 素材清單分頁顯示

圖庫管理中心 SHALL 將素材清單分頁顯示，並在底部顯示目前篩選條件下的總筆數與頁碼列。切換頁碼
SHALL 觸發重新查詢，SHALL NOT 假設所有分頁的資料已經在前端記憶體中。總筆數與各項分類的計數
SHALL 採用後端回傳的統計值，SHALL NOT 由前端已下載的素材清單重新計算。

#### Scenario: 使用者切換頁碼

- **WHEN** 使用者點擊頁碼列中的某一頁
- **THEN** 素材清單改為顯示該頁的素材

##### Example:

- GIVEN 目前篩選條件下共有 40 筆素材，每頁 8 筆，使用者在第 1 頁
- WHEN 使用者點擊頁碼「3」
- THEN 素材清單改為顯示第 17～24 筆素材

#### Scenario: 篩選條件改變時回到第一頁

- **WHEN** 使用者變更資料夾／系統分類／來源篩選／關鍵字搜尋
- **THEN** 頁碼自動回到第 1 頁

##### Example:

- GIVEN 使用者目前在「全部素材」的第 3 頁
- WHEN 使用者點擊左側欄切換到資料夾「春季企劃」
- THEN 頁碼自動回到第 1 頁，顯示「春季企劃」篩選下的第 1 頁素材

#### Scenario: 桌面首屏可看到分頁

- **WHEN** 使用者以 1366×940 視窗開啟素材庫第一頁
- **THEN** 頁碼列完整顯示在首屏內容區內
- **AND** 素材較多時由素材格線內部捲動，不產生整頁垂直捲軸

##### Example:

- GIVEN 使用者以 1366×940 視窗開啟圖庫，目前篩選下有 40 筆素材
- WHEN 頁面完成載入
- THEN 底部頁碼列（1、2、3、4、5）完整可見，素材格線本身有獨立捲軸，瀏覽器視窗本身不出現
  垂直捲軸

#### Scenario: 切換頁碼會重新向後端請求資料

- **WHEN** 使用者點擊頁碼列中尚未載入過的某一頁
- **THEN** 前端發出新的查詢請求取得該頁資料，並在請求進行中顯示載入狀態

##### Example:

- GIVEN 使用者在「全部素材」第 1 頁，尚未載入過第 2 頁的資料
- WHEN 使用者點擊頁碼「2」
- THEN 素材格線顯示載入中狀態，取得回應後才顯示第 2 頁的 8 筆素材，SHALL NOT 是從既有的
  第 1 頁資料裡直接切出結果

#### Scenario: 總筆數與分類計數採用後端提供的統計

- **WHEN** 圖庫顯示「全部素材」與「系統分類」旁的數字
- **THEN** 這些數字直接採用後端回傳的統計值

##### Example:

- GIVEN 後端目前共有 128 筆素材，前端只下載了第 1 頁的 8 筆
- WHEN 圖庫頁面顯示「全部素材（128）」與各系統分類的數字
- THEN 這些數字全部來自後端回傳的 `counts`／`total`，SHALL NOT 等於「目前已下載的 8 筆」
  重新計算出的任何數字

<!-- @trace
source: sync-mv-01-design, library-real-backend
updated: 2026-08-28
code:
  - src/views/LibraryView.vue
  - src/components/AssetCard.vue
  - src/components/FolderRow.vue
  - src/components/ImagePickerDialog.vue
  - src/composables/useAssets.ts
  - src/stores/generationTasks.ts
  - src/types/asset.ts
  - src/api/mock.ts
  - src/api/real.ts
  - src/lang/zh-Hant.ts
  - src/lang/en.ts
-->
