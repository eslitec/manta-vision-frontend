## Why

後端 v14（`feat/text-to-image@53bea79`）把 `POST /generate` 的 `imageId` 由必填改回選填：帶了是圖生圖，沒帶就是純文字生圖（同檔位、同單價、輸出固定 1024×1024），且沒有 `imageId` 時 `strength` 一律忽略。前端圖生圖頁目前仍把參考圖當必要條件：沒選圖「生成圖片」停用、`buildReq` 一定送 `imageId` 與 `strength`、參考強度提示掛著「（需先選參考圖）」，而且參考圖只能設不能清。要讓使用者不放參考圖也能生圖。

## What Changes

- 「生成圖片」只在沒有描述、生成中或檔位沒價格時停用，不再要求參考圖；`generate()`／`regen()` 不再因沒有參考圖提前返回。
- `buildReq` 讀當下的 `refImage`：有圖送 `imageId` 與翻轉後的 `strength`，沒圖兩者都不送（`undefined` 由 `JSON.stringify` 丟掉）；重新生成用當下的參考圖（可為空），與後端「`regenOf` 不沿用原生成那張」一致。
- 參考強度那一列只在有參考圖時顯示；刪掉 `image.referenceRequired`。
- 參考圖區塊加「移除參考圖」按鈕（沿用 `AppButton` subtle），只在有參考圖時顯示。
- i18n（兩語系同步）：`image.steps.reference` 改「1. 參考圖（選填）」、`image.strengthHint` 改「沒有合適的參考圖可以不放；有參考圖時越高越貼近參考圖」、新增 `image.removeReference`。
- `GenerateImageReq.imageId` 改選填並更新註解；`real.spec.ts` 補「沒有參考圖時 body 不含 `imageId` 與 `strength`」。mock 的 `generateImages` 本來就不讀 `imageId`，型別放寬即可。

## Non-Goals (optional)

- 不動結果卡、存入圖庫、下載的邏輯。
- 不做拖曳上傳、不改 `ImagePickerDialog`。
- 不處理後端 `MODEL_NOT_ALLOWED`（檔位沒有 `text_endpoint`）的專屬文案：三檔都有 `text_endpoint`，沿用既有的後端訊息顯示。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `generate-image-backend`: 圖生圖請求的參考圖改為選填；沒有參考圖時不送 `imageId` 與 `strength`，重新生成用當下的參考圖。
- `generate-image-ui`: 參考圖步驟標為選填、可移除參考圖、參考強度列只在有圖時顯示；送出與重生成不再以參考圖為前提。

## Impact

- Affected specs: `generate-image-backend`、`generate-image-ui`
- Affected code:
  - Modified:
    - src/views/GenerateImageView.vue
    - src/types/api.ts
    - src/api/real.spec.ts
    - src/lang/zh-Hant.ts
    - src/lang/en.ts
