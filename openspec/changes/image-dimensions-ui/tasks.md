## 1. 型別與 API 層

- [x] 1.1 落地設計決策「決策 3：`Asset` 用獨立的 `width?`／`height?` 數字欄位，不解析 `dim` 字串」：`src/types/asset.ts` 的 `Asset` 加 `width?`／`height?`；`src/api/real.ts` 的 `toAsset` 帶出（null → undefined），migration 註解改指 `feat/image-dimensions`；`src/api/mock.ts` 假素材補 `width`／`height`、`materialAsAsset` 帶出 Material 的寬高
- [x] 1.2 `src/api/real.spec.ts` 補 `toAsset` 帶出 `width`／`height` 與 null → undefined 的斷言（cp 快照後改壞「null 直通」與「不帶出」各自會紅、還原後綠）

## 2. 編輯器

- [x] 2.1 對齊 Requirement「裁切提供各通路預覽且不扣飼料」，落地設計決策「決策 1：原圖尺寸來源＝先用 `Asset.width`／`height`，畫布 `<img>` 載入後以 `naturalWidth`／`naturalHeight` 覆蓋，都沒有就 null」：`src/components/ImageEditorWorkspace.vue` 加 `originalDimensions`（`selectEditorAsset` 取 `asset.width`／`height`，主畫布 `<img>` `@load="onSourceImgLoad"` 載入後以 natural 尺寸覆蓋）；側欄尺寸行、畫布徽章、畫布提示（`canvasHint`）在取不到尺寸時不顯示；刪除 `ORIGINAL_IMAGE_DIMENSIONS`。驗證：`grep -c 1440 src/components/ImageEditorWorkspace.vue` 為 0
- [x] 2.2 落地設計決策「決策 2：顯示尺寸與 `buildCroppedFile` 共用同一套 cover 換算（`cropSourceRect`）」：cover 換算抽成 `cropSourceRect`，`buildCroppedFile` 與 `cropOutputDimensions` 共用，各比例寫死的輸出尺寸一併刪除

## 3. 驗證

- [x] 3.1 `npx vitest run` 0 failed（基準 231）；`npx vue-tsc --noEmit`、`npm run lint` exit 0；`npx prettier --check` 改動檔全過；i18n 兩份 key 對齊與基準相同（zh-Hant 多 8 個 `editor.retouch.*`，en 0）
- [x] 3.2 `spectra validate image-dimensions-ui` 與 `spectra analyze image-dimensions-ui` 無 Coverage／Consistency／Gaps 發現

## 4. 收尾

- [ ] 4.1 PR 合併並確認畫面驗收無誤後執行 `spectra archive image-dimensions-ui`
