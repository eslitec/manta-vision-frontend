## Why

編輯器裁切面板的「已裁切為 {寬} × {高} px（原圖 {原寬} × {原高}）」、畫布上的套用結果徽章與「{寬} × {高} px ・ 拖曳邊角調整範圍」提示，數字全是從寫死的 `ORIGINAL_IMAGE_DIMENSIONS = 1440 × 1080`（Figma 稿的示範值）與各比例的固定值（1080 × 1350 等）算出來的，跟使用者實際選的素材無關，也跟 `buildCroppedFile` 真正另存出來的像素尺寸對不上。後端（`feat/image-dimensions`）讓 `ImageResponse`／`MaterialResponse` 帶 `width`／`height`（量不出來為 null），前端可以改用真尺寸。

## What Changes

- `Asset` 加選填 `width`／`height` 數字欄位（`dim` 仍是顯示字串）；`real.ts` 的 `toAsset` 帶出（null → undefined）；mock 的假素材補上合理尺寸、`materialAsAsset` 帶出 Material 的寬高
- 編輯器：原圖尺寸先取所選素材的 `width`／`height`，主畫布 `<img>` 載入後以 `naturalWidth`／`naturalHeight` 覆蓋（套 EXIF 方向，與另存輸出同源），兩者都沒有就不顯示尺寸文字（側欄尺寸行、畫布徽章、畫布提示）；刪除 `ORIGINAL_IMAGE_DIMENSIONS` 與各比例寫死的輸出尺寸
- 顯示的裁切輸出尺寸改用與 `buildCroppedFile` 同一套 cover 換算（抽成 `cropSourceRect`），顯示數字＝實際另存的像素
- `real.ts` 對後端 migration 的註解改指向 `feat/image-dimensions`（後端 migration 檔尚未 commit，無法引用檔名）

## Non-Goals

- 不改 `buildCroppedFile` 的裁切計算（本來就用原圖像素）
- 試穿模特庫（`TryOnView.vue`）與編輯器目前沒有顯示素材尺寸的地方，不新增 UI；圖庫卡片的尺寸顯示（`formatDimensions`）維持不變
- 不動 `editor.dimensions`／`editor.cropInstruction` 這兩個未被引用的靜態 i18n key；不新增 i18n 字串

## Capabilities

### Modified Capabilities

- `image-editor-ui`：裁切面板的原圖尺寸與裁切輸出尺寸改為所選素材的真實像素，不再寫死 1440 × 1080；取不到尺寸時不顯示尺寸文字

## Impact

- Affected specs: image-editor-ui
- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue（`originalDimensions`／`onSourceImgLoad`／`cropSourceRect`／`cropOutputDimensions`／`canvasHint`；刪除 `ORIGINAL_IMAGE_DIMENSIONS`）
  - Modified: src/types/asset.ts（`Asset.width?`／`height?`）
  - Modified: src/api/real.ts（`toAsset` 帶出 width／height；註解改指 `feat/image-dimensions`）
  - Modified: src/api/mock.ts（假素材補 width／height、`materialAsAsset` 帶出）
  - Modified: src/api/real.spec.ts（`toAsset` 的 width／height 與 null → undefined 斷言）
- 後端契約（`feat/image-dimensions`）：`ImageResponse`／`MaterialResponse` 新增 `width`、`height`（number | null；量不出來為 null）；`GET /images` 合併回傳的內建素材列也有
