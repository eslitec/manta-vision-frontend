## Summary

圖庫管理中心（`/library`）的素材縮圖，統一從目前的 244:152（約 1.6:1，偏橫）改成 1:1 正方形比例，涵蓋主格線卡片、生成中任務的佔位卡片、以及刪除確認彈窗的預覽框。

## Motivation

老闆要求「圖庫管理中心的圖片長寬都要一樣」。目前 `AssetCard.vue` 的縮圖框（`.assetCard__thumb`）雖然已經是固定 `aspect-ratio: 244 / 152` 加 `object-fit: cover`，格線本身早就整齊，但圖庫裡混合了背景素材（多為橫向構圖）、物件素材（多為方形構圖）、模特素材（多為直向全身／半身照）三種天生比例差異很大的內容，硬塞進同一個偏橫的框，直向的模特照片容易被裁到頭或腳，視覺上呈現不一致，這才是老闆實際感受到「長寬不一樣」的來源。另外刪除確認彈窗（`.deleteConfirm__thumb`，`LibraryView.vue`）目前用的是不同的 `4 / 3` 比例，跟主格線本來就不一致，這次一併統一。

三種素材類型裡沒有一種比例是「中性」的，1:1 正方形是裁切幅度最平均的折衷選擇：不特別偏袒任何一種原始構圖方向，也是多數混合類型素材庫常見的統一縮圖比例（例如電商後台商品格線）。

## Proposed Solution

- `src/components/AssetCard.vue` 的 `.assetCard__thumb`：`aspect-ratio` 從 `244 / 152` 改成 `1 / 1`；寬度維持既有的 `width: 100%`（跟隨 `.assets__grid` 的 `grid-template-columns: repeat(auto-fill, minmax(12.5rem, 15.75rem))`，不寫死 px），縮圖裁切方式維持既有的 `object-fit: cover`，不改成 `contain`
- `src/views/LibraryView.vue` 生成中任務的佔位卡片（`.asset--pending` 底下的縮圖框，目前也是 `244 / 152`）同步改成 `1 / 1`，維持跟真實素材卡片視覺一致
- `src/views/LibraryView.vue` 刪除確認彈窗的預覽縮圖（目前 `4 / 3`）改成 `1 / 1`，跟主格線統一
- 因為主格線縮圖比例改變，`openspec/changes/add-library-loading-skeleton` 這個仍在進行中、尚未歸檔的 change 所實作的骨架屏縮圖佔位（`.assetSkeleton__thumb`，目前固定 `15.25rem × 9.5rem`，對齊 Figma node `1309:7676` 的原始橫向比例）需要跟著改成正方形，否則載入中的骨架屏跟載入完成的實際卡片會呈現不同比例、造成畫面跳動。這個調整透過 `/spectra-ingest` 更新回那個既有 change，不在這次新增的 delta spec 裡重複描述

## Non-Goals

- 不改變素材的上傳流程：不要求使用者上傳前先裁成正方形，也不在上傳時新增自動裁切步驟；裁切完全交給既有的 `object-fit: cover` 在顯示層處理
- 不新增裁切工具或裁切預覽 UI；如果之後因為特定素材類別（例如模特照片）常被裁到關鍵內容而需要上傳時裁切，屬於獨立的後續評估，這次不做
- 不處理 `src/components/ImagePickerDialog.vue`（「從圖庫選擇」彈窗）的縮圖比例——它目前用的是 `159 / 104`，是編輯器選圖情境的獨立版面，不是「圖庫管理中心」頁面本身，這次範圍只限 `/library` 頁面
- 不改變素材的儲存尺寸、原始檔案內容、或後端回傳的 `width`／`height` 資料欄位；`AssetCard.vue` 顯示的尺寸文字（例如「1024×768」）維持顯示素材的實際原始尺寸，不會因為縮圖框變正方形就跟著改示假數字
- 不處理 `ImageEditorWorkspace.vue`（圖片編輯器）內部的裁切框比例預設（`original`／`square`／`4:5`／`9:16`／`16:9`），那是編輯功能本身的裁切比例選項，跟圖庫縮圖的呈現方式無關

## Alternatives Considered

- **改用 `object-fit: contain`（完整顯示、四周留白）取代 `cover`**：優點是保證素材內容完全不被裁掉；缺點是不同素材原始比例差異很大時，留白幅度會很不平均（例如直向模特照片會在左右留很寬的空白），格線視覺反而更不整齊，違背老闆想要「看起來一致」的初衷。維持 `cover` 裁切滿版，格線視覺更乾淨統一
- **維持偏橫比例（例如現有的 244:152），只統一刪除彈窗跟主格線一致**：能解決「兩個地方比例不一樣」的既有小瑕疵，但沒有解決老闆真正在意的「不同素材類型看起來比例感覺不一樣」——偏橫的框對直向模特照片的裁切幅度仍然明顯偏大。不採用
- **依素材分類（背景／物件／模特）套用不同的縮圖比例**：技術上可行，但這樣格線本身反而會出現高矮不一的卡片，不符合「圖庫的圖片長寬都要一樣」這個原始需求的字面意思——老闆要的是「同一個圖庫、同一種呈現方式」，不是「依類型客製化」。不採用

## Impact

- Affected specs: library-management-ui
- Affected code:
  - Modified: src/components/AssetCard.vue（縮圖框 `aspect-ratio` 改為 `1 / 1`）
  - Modified: src/views/LibraryView.vue（生成中佔位卡片縮圖框、刪除確認彈窗預覽框，`aspect-ratio` 皆改為 `1 / 1`）
