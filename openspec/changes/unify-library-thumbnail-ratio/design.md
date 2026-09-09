## Context

`src/components/AssetCard.vue` 的縮圖框（`.assetCard__thumb`）目前是 `width: 100%; aspect-ratio: 244 / 152`（約 1.6:1，偏橫），搭配 `object-fit: cover` 裁切滿版；`src/views/LibraryView.vue` 有兩個地方複用同一個比例：生成中任務的佔位卡片（`.asset--pending` 底下的縮圖框）與骨架屏載入卡片（`.assetSkeleton__thumb`，另一個仍在進行中的 change `add-library-loading-skeleton` 所實作，對齊 Figma node `1309:7676` 的原始橫向比例）；刪除確認彈窗的預覽縮圖則用了不同的 `4 / 3`。

圖庫（`src/types/asset.ts` 的 `Material.category`）混合三種天生比例不同的素材：`background`（背景，多為橫向構圖）、`object`（物件，多為方形構圖）、`model`（模特，多為直向全身／半身照）。老闆要求「圖庫管理中心的圖片長寬都要一樣」，追查後確認格線框大小本來就是固定的（見上），真正的問題是偏橫的框對直向的模特照片裁切幅度過大，加上刪除彈窗跟主格線比例本身就不一致。這次改成 1:1 正方形——三種素材類型都沒有這個比例是「原生比例」，裁切幅度平均，是最中性的選擇（決策過程與其他方案的取捨記錄在 proposal.md 的 Alternatives Considered）。

## Goals / Non-Goals

**Goals:**

- 圖庫管理中心（`/library`）裡所有顯示素材縮圖的地方（主格線卡片、生成中佔位卡片、刪除確認彈窗預覽），縮圖框比例統一為 `1 / 1`
- 維持現有的 `object-fit: cover` 裁切方式與 `width: 100%` 響應式寬度，不因為這次調整而改變版面的響應式行為
- 讓仍在進行中的骨架屏 loading 效果（`add-library-loading-skeleton`）的佔位卡片跟著更新為正方形，避免載入中與載入完成兩個狀態的卡片比例不一致造成畫面跳動

**Non-Goals:**

- 不改變上傳流程、不新增裁切工具（詳見 proposal.md 的 Non-Goals）
- 不處理 `src/components/ImagePickerDialog.vue`（「從圖庫選擇」彈窗）的縮圖比例，那是編輯器選圖情境、不是圖庫管理中心頁面本身
- 不改變 `Material`／`Asset` 的 `width`／`height` 資料欄位或後端回傳內容，`AssetCard.vue` 顯示的尺寸文字維持顯示素材實際原始尺寸

## Decisions

### 決策 1：縮圖框比例統一改為 `1 / 1`（正方形）

背景／物件／模特三種素材類別的原生構圖方向不同（橫向／方形／直向），沒有一種既有比例能公平對待全部三種。1:1 是裁切幅度最平均的折衷：不會像偏橫的框那樣讓直向照片被裁掉頭或腳，也不會像偏直的框讓橫向背景圖被裁掉左右內容。取捨與其他被否決的方案（依類別套用不同比例、維持偏橫比例）記錄在 proposal.md 的 Alternatives Considered。

### 決策 2：維持 `object-fit: cover`，不改成 `contain`

`cover` 裁切滿版、格線視覺乾淨一致；`contain` 完整顯示但會依素材原始比例產生不等幅的留白（直向照片在正方形框裡左右留白會比橫向照片明顯更多），格線反而看起來更不整齊，違背老闆想要「長寬都一樣」背後「看起來一致」的初衷。維持現有裁切方式，只調整框的比例。

### 決策 3：範圍限定在圖庫管理中心頁面本身，不含「從圖庫選擇」彈窗

`ImagePickerDialog.vue` 的縮圖比例（`159 / 104`）是編輯器內挑選既有素材時的獨立版面，跟老闆講的「圖庫管理中心」（`/library` 頁面）是不同的使用情境與版面密度。這次只處理使用者直接瀏覽圖庫時看到的三個位置（主格線、生成中佔位卡片、刪除確認彈窗），維持範圍精準、避免不必要地牽動編輯器的既有版面。

### 決策 4：骨架屏佔位卡片改用 ingest 更新既有 change，不在這個 change 裡重複描述

`add-library-loading-skeleton` 這個 change 目前仍在進行中（尚未歸檔），它的骨架屏佔位卡片（`.assetSkeleton__thumb`）尺寸是對齊 Figma node `1309:7676` 的靜態稿（244:152），跟這次要改的正方形比例衝突。因為骨架屏佔位卡片的規格（含 Figma 對齊理由、決策 5 的最短顯示時間、決策 6 的清空邏輯）完整記錄在那個 change 自己的 design.md／spec.md 裡，這裡不重複貼一份，而是等這個 change 的 delta spec 定案後，用 `/spectra-ingest` 把「佔位卡片改成正方形、不再對齊 Figma `1309:7676` 的原始橫向比例（因為老闆的正方形要求覆蓋了原本的 Figma 靜態稿）」這個異動同步過去。兩個 change 的實作（`.vue` 檔案改動）會在同一輪 apply 一起完成，只是規格文件分開記錄，避免同一件事在兩份文件裡各寫一次、之後容易對不齊。

## Implementation Contract

**行為**：使用者瀏覽 `/library` 時看到的素材縮圖，不論是主格線的素材卡片、生成中任務的佔位卡片，一律呈現 1:1 正方形的裁切滿版縮圖（`object-fit: cover`），取代原本偏橫的 244:152 比例；使用者選取素材並開啟刪除確認彈窗時，預覽縮圖同樣呈現 1:1 正方形，取代原本的 4:3 比例。素材原始檔案內容、尺寸資料、顯示的尺寸文字（例如「1024×768」）皆不受影響——只有縮圖框本身呈現的裁切比例改變。

**資料形狀**：純 CSS 調整，不涉及任何 TypeScript 型別、API 回應格式、或 Pinia store 狀態的變動。

**失敗模式**：無新增失敗模式；`AssetCard.vue` 既有的圖片載入失敗回退邏輯（`imgError` ref，載入失敗時顯示 `imagePlaceholderUrl` 灰色示意圖示）維持不變，示意圖示同樣會被套用到新的正方形框內。

**驗收標準**：

- `src/components/AssetCard.vue` 的 `.assetCard__thumb` 的 `aspect-ratio` 為 `1 / 1`
- `src/views/LibraryView.vue` 生成中佔位卡片（`.asset--pending` 底下的縮圖框）的 `aspect-ratio` 為 `1 / 1`
- `src/views/LibraryView.vue` 刪除確認彈窗預覽縮圖的 `aspect-ratio` 為 `1 / 1`
- 瀏覽器手動驗證：`/library` 主格線裡混合背景／物件／模特三種素材類型的卡片，縮圖框外觀尺寸（寬高比）一致；生成中的佔位卡片跟旁邊的實際素材卡片框架比例一致；開啟刪除確認彈窗時預覽縮圖也是正方形
- `npm run lint` 與 `npx vue-tsc --noEmit` 通過

**範圍邊界**：僅限 `src/components/AssetCard.vue` 與 `src/views/LibraryView.vue` 這次新增的三處 `aspect-ratio` 調整；`add-library-loading-skeleton` 的骨架屏佔位卡片透過 ingest 那個既有 change 處理（見決策 4），不在這個 change 的 tasks 裡；不修改 `ImagePickerDialog.vue`、`ImageEditorWorkspace.vue`、任何 API 或型別定義。

## Risks / Trade-offs

- [風險] 正方形框對「背景素材」這種原生就偏橫的內容，裁切幅度會比現況更大（現況的 1.6:1 框本來就比較適合背景素材，正方形框反而讓背景素材裁掉的左右範圍變多）→ [緩解] 這是決策 1 已經權衡過的取捨：沒有一種比例能同時公平對待三種類型，1:1 是三者裁切幅度加總最平均的選擇；如果之後背景素材的裁切問題明顯到需要處理，可以之後再評估依類別呈現不同比例，但那會改變「圖庫長寬都一樣」的原始需求，需要跟老闆重新確認
- [風險] 這次只統一「顯示層」的比例，素材本身的原始檔案比例仍然五花八門，如果未來這些素材要被程式化用在生成流程（例如當背景圖或模特底圖），原始檔案的比例落差不會因為這次修改而消失 → [緩解] proposal.md 的 Non-Goals 已明確排除這個範圍；這次只解決老闆提出的「圖庫瀏覽視覺一致」，不是「生成用途的素材規格標準化」，兩者是不同問題，需要的話應該另外開一個 change 處理
