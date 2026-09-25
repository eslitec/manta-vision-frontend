## Why

圖庫管理中心的「全部素材」「物件素材」「未分類」三個檢視，目前是前端自己把 `GET /materials` 的內建素材跟使用者圖庫合併：為了合併分頁，使用者圖庫得整批撈回來（`fetchAllRealAssets` 以 100 筆一頁迴圈打到撈完）再在前端切頁，左側計數也要各自把內建素材加回去。這套邏輯讓 `LibraryView.vue` 多出約 150 行的合流／切頁／計數補正碼，而且違反既有規格「總筆數與各項分類的計數 SHALL 採用後端回傳的統計值」。後端（`feat/library-builtin-source`）已改成由 `GET /images` 直接把內建素材合併進來（統一 `createdAt DESC` 分頁、`counts` 加 `builtin`、`all`／`object` 已含內建），前端可以整段刪掉。

## What Changes

- 「來源」工具列加第五顆 chip「內建素材」（`source=builtin`），放在「編輯產物」之後；i18n `sources.builtin`（zh-Hant「內建素材」／en「Built-in」）
- 所有檢視都改成單次分頁的 `GET /images`：刪除 `LibraryView.vue` 的 materials 客戶端合併（`mergesMaterials`／`materialsForView`／`pagedMaterials`／`pagedRealAssets`）、整批重撈（`fetchAllRealAssets`）與 `onMounted` 的 `listMaterials` 呼叫
- 左側「全部素材」「物件素材」「未分類」的數字直接用後端 `counts.all`／`counts.object`／`unfiledCount`，「共 N 筆」用後端 `total`；不再由前端把內建素材加回去
- 內建素材與使用者的圖混在同一個 grid，卡片以來源標籤「內建素材」區分；原本的「內建素材」小標段落與 `library.builtinMaterials` i18n key 一併移除（既有規格沒有要求這個小標）
- 內建素材卡片不可選取（`selectable=false`，沿用先前 materials 卡片的呈現），「全選本頁」與所有批次操作（移至資料夾／移出／下載／刪除）一律排除 builtin
- `AssetSource` 加 `'builtin'`；`WireImage`／`Asset` 加選填 `category`（內建素材投影才有值）；`ImageCounts` 加 `builtin`
- mock `listImages` 同形：不帶 `source` 時合併 mock materials、`source=builtin` 只回內建、帶 `folderId`／`mediaType=video` 不含內建、`counts.builtin`／`all`／`object` 對齊後端算法

## Non-Goals

- 試穿頁（`TryOnView.vue`）與編輯器物件面板仍用 `GET /materials`（`listMaterials`），不動
- 「從圖庫選擇」彈窗（`ImagePickerDialog.vue`）共用 `listImages`，內建素材自然出現在「全部」清單裡可被選為底圖／參考圖（它有 `url`）；彈窗自己的三顆篩選 pill（設計稿 `dlg_filter`）不加「內建素材」
- 不動 `ImageEditorWorkspace.vue`／`UsageView.vue`／`GenerateImageView.vue`
- `add-library-loading-skeleton` 的 delta spec 提到的「合流檢視」自此不存在（所有檢視都是單頁伺服器分頁、一律清空後觸發骨架屏），該 change 尚未歸檔，其措辭留待歸檔時整理

## Capabilities

### Modified Capabilities

- `library-management-ui`：來源篩選改成五顆（全部／上傳／AI 生成／編輯產物／內建素材）；內建素材由後端合併進 `GET /images`、卡片標「內建素材」且不可選取；全部數字（總筆數、全部素材、系統分類、未分類）一律直接來自後端

## Impact

- Affected specs: library-management-ui
- Affected code:
  - Modified: src/views/LibraryView.vue（刪除 materials 合併／整批重撈／小標，chips 加 builtin，卡片 selectable 依 source）
  - Modified: src/types/asset.ts（`AssetSource` 加 `builtin`、`Asset.category?`、`ImageCounts.builtin`）
  - Modified: src/api/real.ts（`WireImage.category`、`toAsset` 帶出 `category`）
  - Modified: src/api/mock.ts（`listImages` 合併 mock materials、`countByBucket` 加 builtin）
  - Modified: src/composables/useAssets.ts（counts 預設值加 `builtin`）
  - Modified: src/lang/zh-Hant.ts、src/lang/en.ts（`sources.builtin`；移除 `library.builtinMaterials`）
  - Modified: src/api/real.spec.ts、src/composables/useAssets.spec.ts（測試對齊）
- 後端契約：`GET /images` 不帶 `source` → 該 bot 的 images ∪ 全域 materials；`source=builtin` 只回內建；帶 `folderId`（含未分類）或 `mediaType=video` 不含內建；`q` 對內建名稱生效；`counts.builtin` 新增、`all`／`object` 含內建；內建素材投影為 `imageId=materialId`、`source='builtin'`、`folderId=null`、`isInUse=false`、`mediaType='image'`、選填 `category`
