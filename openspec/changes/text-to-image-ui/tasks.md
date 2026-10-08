## 1. 圖生圖頁

- [x] 1.1 對齊 Requirement「圖生圖請求以參考圖為選填並使用後端欄位」（原 Requirement「圖生圖請求以參考圖為必要條件並使用後端欄位」改名），落地設計決策「決策 1：`buildReq` 自己讀 `refImage`，呼叫端不再傳 id」「決策 2：無圖時不送 `strength`，而不是靠後端忽略」：`src/views/GenerateImageView.vue` 的 `buildReq(n, regenOf?)` 自己讀 `refImage.value?.id`，有圖才送 `imageId` 與 `strength`；`generate()`／`regen()` 拿掉 `!reference` 守衛；「生成圖片」`:disabled` 拿掉 `!refImage`。驗證：`grep -n "!refImage\|reference.id" src/views/GenerateImageView.vue` 為 0 筆
- [x] 1.2 對齊 Requirement「選擇模型、參考圖與描述後送出生成」與 Requirement「生成結果的後續操作」，落地「決策 3：「移除參考圖」直接 `refImage = null`，不清滑桿」：參考強度 `.adv__row` 加 `v-if="refImage"`、提示不再接 `image.referenceRequired`；`.dropzone__actions` 加「移除參考圖」`AppButton(variant="subtle")`（`v-if="refImage"`，點擊 `refImage = null`）；重新生成沿用同一個 `buildReq`（當下參考圖可為空）。驗證：`npx vue-tsc --noEmit` exit 0
- [x] 1.3 i18n 與型別：`zh-Hant.ts`／`en.ts` 依 design.md Implementation Contract 改 `image.steps.reference`、`image.strengthHint`、新增 `image.removeReference`、刪 `image.referenceRequired`；`src/types/api.ts` 的 `GenerateImageReq.imageId` 改 `imageId?: string` 並更新註解。驗證：`grep -rn referenceRequired src` 為 0 筆；i18n 葉節點差集等於基準（zh-Hant 獨有 8 個 `editor.retouch.*`、en 0）

## 2. 測試與驗證

- [x] 2.1 `src/api/real.spec.ts` 補「沒有參考圖（純文字生圖）：body 不含 imageId 與 strength」。驗證：`cp` 快照 `real.ts` 後把 body 改成 `{ ...req, strength: req.strength ?? 0.5 }` 該測試轉紅，`cp` 還原後 `npx vitest run src/api/real.spec.ts` 全綠
- [x] 2.2 `npx vitest run` 0 failed（基準 224 → 225）；`npx vue-tsc --noEmit`、`npx eslint .` exit 0；`npx prettier --check` 改動檔通過
- [x] 2.3 真後端瀏覽器實測（puppeteer-core，:5173）：有描述、沒選參考圖時「生成圖片」可按且參考強度列不存在；從圖庫選圖後參考強度列出現與「移除參考圖」按鈕出現；按「移除參考圖」後回到無圖狀態；不按生成（不扣點）；截圖存 scratchpad/t2i-ui/；結束無殘留 headless Chrome
- [x] 2.4 `spectra validate text-to-image-ui` 通過；`spectra analyze text-to-image-ui` Coverage／Consistency／Gaps 皆 0
