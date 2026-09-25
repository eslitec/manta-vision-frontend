## Context

`ImageEditorWorkspace.vue` 的裁切尺寸文字沿用 Figma（1144:631）稿上的示範值 1440 × 1080，各固定比例也各自寫死輸出尺寸；實際另存（`buildCroppedFile`）卻是用載入後原圖的 `naturalWidth`／`naturalHeight` 做 cover 換算，畫面上的數字與產物對不上。後端 `feat/image-dimensions` 讓 images／materials 帶 `width`／`height`。

## Goals / Non-Goals

- Goals：尺寸文字反映所選素材的真尺寸與實際輸出像素；取不到就不顯示；刪掉寫死常數
- Non-Goals：不改裁切計算本身；不新增尺寸顯示點；不新增 i18n 字串

## Decisions

### 決策 1：原圖尺寸來源＝`Asset.width`／`height` 優先，退回畫布 `<img>` 的 `naturalWidth`／`naturalHeight`，都沒有就 null

後端對舊資料與 Pillow 解不開的檔案回 null，這些圖在畫布載入後瀏覽器一樣知道尺寸，所以在主畫布 `<img>` 掛 `@load` 補上；`selectEditorAsset` 每次換素材都先重設，避免上一張的尺寸殘留。兩者都取不到（圖還沒載入或載入失敗）時 `cropOutputDimensions` 回 null，三個顯示點（側欄尺寸行、畫布徽章、畫布提示）都以 `v-if` 隱藏，不顯示假數字。替代方案「取不到時退回 1440 × 1080」被否決：那正是要拿掉的錯誤數字。

### 決策 2：顯示尺寸與 `buildCroppedFile` 共用同一套 cover 換算（`cropSourceRect`）

把 `buildCroppedFile` 裡的 cover 區域與 cropRect 百分比換算抽成 `cropSourceRect(naturalWidth, naturalHeight)`，顯示端用同一函式取 width／height 後 `Math.max(1, Math.round())`（與 canvas 尺寸同式），所以側欄與徽章顯示的數字就是另存出來的像素。各固定比例原本寫死的 1080 × 1350 等值一併刪除——它們與實際輸出無關。

### 決策 3：`Asset` 用獨立的 `width?`／`height?` 數字欄位，不解析 `dim` 字串

`dim` 是給卡片顯示的格式化字串，回頭 parse 它取數字是繞路；比照 `folderId` 的慣例，後端 null 在 `toAsset` 正規化成 undefined。mock 假素材與 `materialAsAsset` 同步補上，讓 mock 模式的編輯器也走同一條路。
