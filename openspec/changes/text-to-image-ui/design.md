## Context

`GenerateImageView.vue` 的 `buildReq(imageId, n, regenOf?)` 由 `generate()`／`regen()` 傳入 `refImage.value.id`，兩者都在沒有參考圖時 `return`；「生成圖片」按鈕的 `:disabled` 含 `!refImage`；參考強度滑桿的提示在沒圖時接一段 `image.referenceRequired`。`realApi.generateImages` 把 `req` 整包當 body，`undefined` 的鍵由 `JSON.stringify` 丟掉。後端 v14 契約（`app/schemas/generation.py`、`docs/api/v14.md`）：`image_id: UUID | None = None`；無 `imageId` 時 `strength` 忽略；`regenOf` 用當下這次請求的 `imageId`（可為空）。

## Goals / Non-Goals

**Goals:**

- 沒有參考圖也能送出生成與重新生成，body 不含 `imageId` 與 `strength`。
- 畫面明確告知參考圖是選填、可以移除，參考強度只在有圖時出現。

**Non-Goals:**

- 不改 `real.ts`／`mock.ts`／stores。
- 不做拖曳上傳。

## Decisions

### 決策 1：`buildReq` 自己讀 `refImage`，呼叫端不再傳 id

`buildReq(n, regenOf?)` 內部取 `refImage.value?.id`；有值才送 `strength`。呼叫端只剩 `generating`／價格／種子三個守衛。理由：兩個呼叫端本來就只是把同一個 ref 傳進來，收回去之後「無圖不送 strength」只有一處要對。

### 決策 2：無圖時不送 `strength`，而不是靠後端忽略

後端會忽略，但畫面上滑桿已藏起來，送一個使用者看不到的值只會讓 request log 難讀。`strength: imageId ? toBackendStrength(...) : undefined`。

### 決策 3：「移除參考圖」直接 `refImage = null`，不清滑桿

滑桿值保留，下次選圖時沿用；沒圖時整列 `v-if` 藏起來。

## Implementation Contract

- i18n：`image.steps.reference` zh「1. 參考圖（選填）」／en「1. Reference image (optional)」；`image.strengthHint` zh「沒有合適的參考圖可以不放；有參考圖時越高越貼近參考圖」／en「No suitable reference? Leave it out. With one, higher stays closer to the reference」；`image.removeReference` zh「移除參考圖」／en「Remove reference」；刪 `image.referenceRequired`。
- 驗證：`npx vitest run` 0 failed；`npx vue-tsc --noEmit`、`npx eslint .` exit 0；`npx prettier --check` 改動檔；i18n 葉節點差集等於基準（zh-Hant 獨有 8 個 `editor.retouch.*`、en 0）；真後端瀏覽器實測只驗按鈕與滑桿列的顯示狀態，不按生成。
