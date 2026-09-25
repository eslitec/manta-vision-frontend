## Why

AI 試穿工作台（MV-05）目前只有 UI 殼：`api.tryOn()` 不帶參數、mock 固定扣 15、結果區只顯示一行文字，同意狀態是 mock 記憶體值（重新整理歸零），估價寫死 12，已上傳的模特照重新整理就消失。後端 `feat/tryon` 分支（docs/api/v14.md #17／#24／#25／#4）已上線 `POST /tryon`、`GET/PUT /users/me/consent`、`POST /upload` 的 `source=tryonModel` 與 `GET /images?source=tryonModel`，前端必須照契約送請求（冪等鍵、202 輪詢、403 `CONSENT_REQUIRED`），並拿掉契約定案不做的東西（品牌介入、審核狀態、條款 PDF）。

## What Changes

- `src/api/real.ts` 新增 `tryOn(req)`（`POST /tryon`，走既有 `runGeneration`：`Idempotency-Key`、100 秒逾時、202 → `GET /generations/{id}` 輪詢；`results[0]` 翻成 `GeneratedImage`）、`getConsent()`（`GET /users/me/consent` → `{ consented }`）、`giveConsent()`（`PUT /users/me/consent` body `{ consent: true }`）；`uploadImage` 加第 5 個選填參數 `source`（`'object' | 'tryonModel'`，有帶才進表單）；`saveGenerated(name, from)` 的 `from` 改必填，拿掉「沒帶 from 落 mock」的過渡分支
- `src/types/api.ts` 的 `TryOnReq` 改成契約形狀 `{ modelSource: 'material' | 'upload', modelRefId, clothImageId }`；`src/types/asset.ts` 的 `AssetSource` 加 `'tryonModel'`、新增 `UploadSource`；`src/api/errors.ts` 加 `CONSENT_REQUIRED`
- `src/api/mock.ts` 同形：`MOCK_MODELS` 加 `tryonStandard`（12 顆）、`tryOn(req)` 扣 12 並回一張帶圖（picsum）的 `GeneratedImage`、`uploadImage` 收 `source`、`countByBucket` 把 `tryonModel` 算進 `upload` 格；`getConsent`／`giveConsent` 維持
- `src/composables/useAssets.ts` 的 `upload` 轉發 `source`、`saveGenerated` 的 `from` 必填
- `src/views/TryOnView.vue`：
  - 同意：掛載時 `consentStore.load()`（真後端 `GET /users/me/consent`）；視窗按「我知道了」打 `PUT`；視窗內容顯示品牌設定的 `portraitConsent`（brand store，空時 i18n `brandSettings.defaults.portraitConsent`）；拿掉「下載條款 PDF」按鈕
  - 模特照：上傳帶 `source='tryonModel'`；掛載時 `GET /images?source=tryonModel`（pageSize 20）撈回清單；清單顯示 n／20，第 21 張後端 400 直接顯示後端訊息；拿掉審核 pill、「需重傳」文案、示範列；上傳列可點選成為當前模特（`modelSource='upload'`），上傳成功自動選中
  - 生成：`api.tryOn({ modelSource, modelRefId, clothImageId })`；模特來源看目前分頁（內建→`material`＋`materialId`，上傳→`upload`＋`imageId`）；缺模特、缺衣服、價格未載入、生成中都停用按鈕；403 `CONSENT_REQUIRED` → 本機同意狀態改回未同意並開同意視窗；生成中離開頁面要確認（`onBeforeRouteLeave`＋`beforeunload`，同圖生圖頁）；結果區顯示 `results[0]` 的圖
  - 結果：存入圖庫 `saveGenerated(name, result)`（`ALREADY_SAVED` 當已存入）；下載走 `downloadFile` 並送 `recordAdoption`（後端 `record_adoption_event` 不看生成類型，試穿也收）；重新生成＝再跑一次 `onGenerate`
  - 估價讀 `GET /ai-models?modelType=tryon` 的 `costFeeds`（載入前顯示「…」且停用生成鈕）；生成後 `feed.refresh()`
  - 拿掉 `BrandToggle`／`applyBrand`／`goBrandSettings`
- i18n（兩語系同步）：新增 `sources.tryonModel`（模特照／Model photo，圖庫卡片標籤用）；改 `tryOn.resultHint` 為 24 小時提示、`tryOn.terms.intro` 改指品牌設定的模板；刪掉 `tryOn.upload.available`／`reupload`／`notes.*`、`tryOn.demoModels`、`tryOn.generated`、`tryOn.terms.items`／`more`／`download`
- 測試：`real.spec.ts` 補 `/tryon` 200／202／403、consent 兩支、`uploadImage` 帶 `source`；`mock.spec.ts`／`useAssets.spec.ts` 對齊新簽名

## Non-Goals

- 不擋第 21 張、不做前端同意撤回（契約沒有撤回，PUT 只收 `true`）
- 不改 `consent` store 的快取策略（`loaded` 後不重打；登出不清——換帳號登入時若狀態過期，後端 403 會把視窗再開一次）
- 內建模特庫「檢視完整模特庫」按鈕維持無動作；面板的「我已取得此人肖像使用同意」勾選維持純顯示
- 不做多角度／多張結果：後端 `results[]` 固定一張
- 不動 `tryon-model-upload-real-backend` change 的文件；其 delta spec 寫的「SHALL NOT 帶 `source`」由本 change 的「模特照持久化」要求取代（歸檔順序：先它、後本 change）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `tryon-ui`：試穿生成走真後端（`POST /tryon` 契約形狀、202 輪詢、403 開同意視窗、缺件先擋、生成中離開確認）；肖像同意讀寫後端並顯示品牌設定的條款模板、無 PDF；模特照持久化（`source=tryonModel` 上傳、重新整理撈回、可點選、n／20）、無審核狀態；估價讀後端價格；結果顯示真圖、存入圖庫帶 `generationId/resultId`、下載走共用工具並記採用；無品牌開關

## Impact

- Affected specs: tryon-ui
- Affected code:
  - Modified: src/views/TryOnView.vue、src/api/real.ts、src/api/mock.ts、src/api/errors.ts、src/types/api.ts、src/types/asset.ts、src/composables/useAssets.ts、src/lang/zh-Hant.ts、src/lang/en.ts、src/api/real.spec.ts、src/api/mock.spec.ts、src/composables/useAssets.spec.ts
  - Removed: (none)
- 不改：src/stores/consent.ts（mock／real 的 `getConsent` 回同形 `{ consented }`）、src/stores/brand.ts、src/components/BrandToggle.vue（其他頁仍用）、src/api/http.ts
- 後端依賴：manta-vision-backend `feat/tryon`（docker :8000）；後端一行都不改
