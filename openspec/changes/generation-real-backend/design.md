## Context

圖生圖（MV-02）與行銷 PO 文（MV-03）兩頁目前只接 mock：`GenerateImageView.vue` 把單價寫死成 8、預估消耗沒有乘張數、結果是佔位圖；`MarketingPostView.vue` 只有一個「商品介紹」欄位、海報下載是 TODO；`realApi` 以 `...mockApi` 展開，所以真後端模式下這兩頁與右上角餘額仍是假資料。

後端契約以 manta-vision-backend `feat/mv-07-metrics` 分支（HEAD 6a44aaa，尚未合進 main）的**程式碼**為準，不以後端 repo 的 v13 API 文件為準。關鍵事實：

- `POST /generate` 的 `GenerateRequest`：`prompt`（1～2000）、`modelKey`、`count`（只能 2 或 4，帶 `regenOf` 時視為 1）、`imageId`（必填，沒有純文字生圖）、`strength`（0～1，低＝貼近參考圖）、`negativePrompt`（≤200）、`seed`（int ≥ 0）、`useBrand`（預設 false）、`regenOf`。
- `POST /marketing/image`：`imageId`、`posterText`（1～200，印在海報上的字）、`ratio`（`1:1`／`16:9`／`9:16`）、`inspirationId`（選填）、`useBrand`；`POST /marketing/text`：`productDesc`（1～200）、`useBrand`。兩支互相獨立。
- 付費端點回 200（同步完成）或 202 `{ generationId, status: 'processing', pollAfterMs }`；後端同步最多等上游 80 秒，Cloudflare 硬上限 100 秒。`GET /generations/{id}` 回 `{ type, status, results | caption/hashtags, ... }`，`type` 為 `marketingText` 時讀 `caption`／`hashtags`，其餘讀 `results`。
- 冪等：後端以 `Idempotency-Key`＋body bytes 判斷重送；同 key 前一發還在跑時回 409 `IDEMPOTENCY_IN_PROGRESS`，直到 200 或 202 定案；200 回放 24 小時、202 回放 900 秒。
- 價格（DB 與 migration）：`imageStandard` 8、`imageAdvanced` 12、`imagePro` 24、`marketingImage` 5、`marketingText` 0（免費期間每分鐘限 20 次）。
- 其他端點：`GET /feeds`、`GET /ai-models?modelType=`、`POST /prompt/enhance`（`{ target, prompt }` → `{ enhancedPrompt }`）、`GET /inspirations`（`inspirationId`／`inspirationName`／`url`／`promptTemplate`）、`POST /generations/{id}/save`（`{ resultId, imageName, folderId? }` → 201 圖片物件）、`POST /generations/{id}/events`（`{ event: 'downloaded', resultId }`，冪等）。

前端限制：`api` 的型別是 `typeof realApi | typeof mockApi`，兩邊簽名必須一致；專案沒有 `@vue/test-utils`，vitest 環境是 `node`，所以行為測試集中在 API 層；ESLint 對 `.ts` 參數開著 `@typescript-eslint/no-unused-vars`，mock 的每個參數都要真的用到。

## Goals / Non-Goals

**Goals:**

- `VITE_USE_MOCK=false` 時，兩頁的每個動作都打真後端，右上角餘額來自 `GET /feeds`。
- 一次點擊最多扣一次點；已付費的結果即使回 202 也拿得到。
- `VITE_USE_MOCK` 沒設或不是 `false` 時，兩頁照樣用 mock 跑完整流程。
- 新錯誤碼不新增 i18n 文案，一律顯示後端寫給人看的 message。

**Non-Goals:**

- AI 試穿：`TryOnView` 的 `saveGenerated(name)` 不帶 `from`，繼續走 mock。
- 圖片編輯器修圖、圖生影：各自有獨立端點與 UI。
- 真正的付款／儲值流程；是否接後端的模擬儲值 `POST /feeds/topup` 見 Open Questions。
- 用量頁、成效指標頁（`/feeds/usage`、`/metrics`）；用量頁寫死的「剩餘 1,240」不處理。
- `POST /marketing/text-suggest`（AI 修飾）、行銷平台選擇、行銷海報「存入圖庫」：前端沒有入口。
- 任務中心的圖片任務（toast、重試、查看的去處）、首頁寫死的價格、dropzone 縮圖、海報預覽比例：既有問題，另開工作。
- 拖曳上傳。

## Decisions

### 輪詢放在 real.ts

202 之後由 `real.ts` 的 `pollGeneration` 輪詢 `GET /generations/{id}`，real 方法輪詢到 `done` 才 resolve、`failed` 或逾期才 reject。view 與 `generationTasks` store 的結構都不用改：`createImageTask` 本來就 await 到 promise 結束。輪詢間隔為 `max(1000, pollAfterMs)`（預設 5000），上限 `POLL_MAX_MS = 11 * 60_000`；輪詢遇到 `TIMEOUT`、`NETWORK_ERROR` 或 HTTP ≥ 500 時等下一輪（GET 本身冪等），其他錯誤直接丟。`runGeneration` 把 POST 與輪詢串起來，**輪詢放在 `postPaid` 的重送迴圈外面**，輪詢失敗不會觸發重送 POST。

替代方案：在 view 或 store 裡輪詢——要改 `generationTasks` 的結構與兩個 view，而且 mock 也得模擬 202，否決。

### Idempotency-Key 一次點擊一把

`postPaid(url, body)` 在進入迴圈前決定 key：模組層的 `openKeys`（`Map`，鍵是「端點＋`JSON.stringify(body)`」）有同一份輸入就沿用那把，沒有就 `crypto.randomUUID()` 產新的並記進去；迴圈內每次重送沿用同一把 key 與**同一個 body 物件**（後端比對 body bytes，物件換了就會被當成新請求再扣一次點）。view 不碰 key。`generatePost` 的 `both` 兩支端點各自呼叫 `postPaid`，所以各自一把 key。非付費端點（`/prompt/enhance`、`/save`、`/events`）不帶 key。

結果確定才從 `openKeys` 刪掉，下次按是真的想再生成一次：任何 2xx（含 202，之後輪詢）、任何 4xx（409 `IDEMPOTENCY_IN_PROGRESS` 除外）、`UPSTREAM_ERROR`（502／504）。結果不確定就留著、錯誤照常丟給畫面：逾時、斷線、閘道 5xx（沒有 `requestId`）用完重送次數、409 等到期限、`UPSTREAM_ERROR` 以外的後端 5xx。使用者用同一份輸入再按一次會沿用同一把 key，前一發若已扣點，後端回放 200／202 或回 409，不會再扣。

`UPSTREAM_ERROR` 是唯一列為「已確定」的 5xx，依據是 manta-vision-backend `feat/mv-07-metrics` 的程式碼：`app/services/generation.py` `_execute` 的 docstring 寫「UpstreamError: 其餘失敗（**已釋放**）」，兜底 `except Exception` 先 `billing.release` 再往上拋；`app/services/exceptions.py` 的 `UpstreamError` 註明計費語意是「釋放」；`app/errors.py` 把 `UpstreamError`／`UpstreamTimeout` 對到 502／504 `UPSTREAM_ERROR`（`billing.release` 自己失敗時會變成 500 `INTERNAL_ERROR`，不會帶這個碼）。其他 5xx 分不出來：`WalletMissing` 雖然擋在扣款前，對外卻與未預期例外同為 500 `INTERNAL_ERROR`；後端沒有 `STORAGE_ERROR` 這個碼，存 R2 失敗會釋放預留，但往上拋的是原例外，對外同樣是 500 `INTERNAL_ERROR`。

上限（程式碼裡的 `ponytail:` 註解寫著同一段）：只存在記憶體，重新整理就消失；輸入差一個字就是新的操作。後端在 5xx 後只把佔位留 `IDEMPOTENCY_CLAIM_TTL_SECONDS`（預設 300 秒），過了之後同一把 key 也會重新執行，所以這把 key 擋的是「結果不確定後短時間內再按一次」。

替代方案：一次呼叫一把、使用者重按一律換新 key——前一發逾時或回應遺失而其實已扣點時，再按一次就重複扣點（codex 審查 high），否決。view 產 key：要改所有呼叫端，否決。

### 只在不確定是否送達時重送

- 不確定有沒有送到（`isTransient`）：`TIMEOUT`、`NETWORK_ERROR`，以及閘道吐的非後端格式 5xx（`status >= 500` 且沒有 `requestId`：nginx 504、Cloudflare 524、部署中的 502）。每 `PAID_RETRY_DELAY_MS = 5000` 重送，含第一次最多 `PAID_MAX_ATTEMPTS = 3` 次。後端自己的錯誤回應一定帶 `requestId`（`app/errors.py` 的 `_body`，未預期例外也走同一個格式），所以兩種 5xx 分得開；同 key 同 body 重送時後端回放 200／202 或回 409，不會雙扣。
- 409 `IDEMPOTENCY_IN_PROGRESS`：不計入次數，每 5 秒重送，直到第一次送出後 `PAID_IN_PROGRESS_MS = PAID_TIMEOUT_MS + 20_000`（120 秒）為止；中途有 `isTransient` 的失敗時，期限從那一次失敗重新算 120 秒（第一發逾時在第 100 秒，後端可能還要跑一陣子，期限若固定從第一次送出算，只剩約 15 秒就放棄）。後端同步最多 80 秒，所以「回應在路上遺失、後端還在跑」的情況在期限內一定拿得到回放的 200 或 202。
- 其他錯誤（402、400、`CONTENT_BLOCKED`、`VALUE_OUT_OF_RANGE`、404、後端回的 5xx…）不重送，直接往上丟。

替代方案：409 也算進 3 次上限——只會在第 5、10 秒各重送一次就放棄，後端還在跑時使用者看到錯誤、再按一次就重複扣點，否決。

### 付費請求 timeout 100 秒

`PAID_TIMEOUT_MS = 100_000`，以 axios 單次請求設定覆寫全域 30 秒（`src/api/http.ts` 不改）。全域 30 秒會在後端已開始扣點時先切斷連線。`enhancePrompt` 另設 `timeout: 40_000`（上游本身 30 秒）。

### 錯誤碼對應

- `API_ERROR_CODES` 新增 `IDEMPOTENCY_IN_PROGRESS`（重送邏輯要用）、`ALREADY_SAVED`（圖生圖頁把它當成已存入：前一發其實存進去了、回應遺失）與 `UPSTREAM_ERROR`（`postPaid` 據此判定預留已釋放、放掉 key，見「Idempotency-Key 一次點擊一把」）。`CONTENT_BLOCKED`、`MONTHLY_LIMIT_EXCEEDED`、`INSPIRATION_UNAVAILABLE` 不加：沒有分流需求，`displayMessage` 直接顯示後端 message。
- `CLIENT_ERROR_CODES` 新增前端依輪詢結果合成的兩個碼，訊息以 `i18n.global.t` 依目前語系產生：`GENERATION_FAILED`（輪詢到 `failed`，`errors.backgroundGenerationFailed`：「若是內容被審核擋下，飼料不會退回，請修改描述後再試」——202 之後被審核擋下，後端的 `failed` 是結清扣點，不能叫人原樣重送）、`GENERATION_STILL_PROCESSING`（輪詢逾期，`errors.generationStillProcessing`，帶 generationId，說明完成時仍會結清飼料、請稍後重新整理確認餘額）。`CLIENT_ERROR_CODES` 的註解補一句「也包含前端依輪詢結果合成的碼」。
- 402 `INSUFFICIENT_FEEDS` 沿用 `isInsufficientFeed` 與既有飼料不足文案。

| 後端情況                                  | 前端收到                      | 畫面                   |
| ----------------------------------------- | ----------------------------- | ---------------------- |
| 402 `INSUFFICIENT_FEEDS`                  | 原樣                          | 既有飼料不足文案       |
| 400 `CONTENT_BLOCKED`（已扣點）           | 原樣                          | 後端 message，刷新餘額 |
| 409 `IDEMPOTENCY_IN_PROGRESS` 超過 120 秒 | 原樣                          | 後端 message           |
| 輪詢到 `failed`                           | `GENERATION_FAILED`           | 依語系的 i18n 訊息     |
| 輪詢超過 11 分鐘                          | `GENERATION_STILL_PROCESSING` | 依語系的 i18n 訊息     |
| 400 `ALREADY_SAVED`（存入圖庫）           | 原樣                          | 當成已存入，不顯示錯誤 |

### 介面改成後端欄位形狀

`src/types/api.ts` 與 api 方法簽名（`mockApi` 與 `realApi` 必須一致）：

| 型別／方法                                 | 改後                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `AiModelType`                              | 新增 `'image' \| 'edit' \| 'video' \| 'tryon' \| 'marketing'`                                                                   |
| `AiModel`                                  | `{ modelKey, name, modelType, costFeeds }`                                                                                      |
| `GenerateImageReq`                         | `{ modelKey, imageId, prompt, count, strength?, negativePrompt?, seed?, useBrand, regenOf? }`，欄位名等於後端，real 整包當 body |
| `GeneratedImage`                           | `{ id /* resultId */, generationId, url /* tempUrl，暫存 24 小時；mock 為 '' */, adopted, savedAssetId? }`                      |
| `GenerationRef`                            | 新增 `Pick<GeneratedImage, 'id' \| 'generationId'>`：呼叫端直接傳結果物件，real 送出時 `resultId: from.id`                      |
| `GeneratePostReq`                          | `{ outputType, useBrand, imageId?, posterText?, ratio?, inspirationId?, productDesc? }`；註解刪掉 `4:5`                         |
| `GeneratedPost`                            | `{ poster?: GeneratedImage, copy?: string, hashtags: string[], partialError?: unknown }`                                        |
| `Inspiration`                              | 新增 `{ id, name, url }`                                                                                                        |
| `listModels`                               | `(modelType?: AiModelType) => Promise<AiModel[]>` → `GET /ai-models`                                                            |
| `generateImages`                           | `(req) => Promise<GeneratedImage[]>`，拿掉 `costPerImage`                                                                       |
| `saveGenerated`                            | `(name, from?: GenerationRef) => Promise<Asset>`；有 `from` 打 `/save`，沒有走 mock                                             |
| `recordAdoption`                           | `(from: GenerationRef) => Promise<void>` → `/events`                                                                            |
| `listInspirations`                         | 新增 `() => Promise<Inspiration[]>` → `GET /inspirations`                                                                       |
| `getFeed`、`enhancePrompt`、`generatePost` | 簽名不變，real 版接上真端點                                                                                                     |

`useAssets().saveGenerated` 同步改成 `(name, from?)` 並轉交 `api.saveGenerated(name, from)`。`TopUpFeedFn` 上方「真後端目前沒有付款端點」的註解改成說明 realApi 明確停用、後端的 `/feeds/topup` 是不收錢的模擬儲值。

### generatePost 在 API 層依輸出類型分流

`generatePost` 維持一支方法，在 real 裡依 `outputType` 以 `Promise.allSettled` 平行呼叫 `runGeneration('/marketing/image', imageBody)` 與 `runGeneration('/marketing/text', textBody)`，兩份 body 分開組。這樣「三種輸出打對的端點」可以在 `real.spec.ts` 測到，不需要元件測試。只成功一半時回傳成功那一半並附 `partialError`；兩半都失敗才 throw。view 端用 `resultType`（這次要求了哪幾半）決定顯示哪幾欄，`generate(only?)` 的 `only` 為 `imageOnly`／`textOnly` 時只替換對應的一半。

### 行銷頁只成功一半時主按鈕只重做失敗那半

「文案＋配圖」只成功一半時，主按鈕改呼叫 `generate(<失敗那半>)`，文字改成 `marketing.retryOnly.imageOnly`／`.textOnly`（只重做配圖／只重做文案），預估消耗與啟用條件也改看那一半；目標由 `src/utils/generation.ts` 的 `retryTarget(prev, next, only)` 決定：兩半都要求時，部分失敗回失敗那半、全成功回 `undefined`；單獨重做時，重做的正是目標那半才解除，重做另一半不影響。改任何輸入（商品圖、商品介紹、海報文字、靈感、品牌開關、比例）或輸出類型時清掉目標，主按鈕回到照所選類型兩半重做——這是使用者要兩半都重做的方式，不另做確認框。

替代方案：主按鈕維持兩半重做、只在錯誤訊息指向那一欄的按鈕——已成功的海報會再扣一次（codex 審查 high），否決。按主按鈕時跳確認框問要不要兩半重做——多一個對話框，而改輸入本來就代表要新的一份，否決。

### 真後端模式停用模擬儲值

`realApi` 加一行 `topUpFeed: undefined`。理由：`...mockApi` 會把假儲值帶進 real 模式，儲值成功會把 mock 的假餘額寫進 feed store，而右上角已改讀真的 `GET /feeds`，畫面會出現「儲值成功、生成卻 402」。TopUpDialog 既有的「不支援」分支直接生效，影響全站 9 個開啟儲值彈窗的入口。

### 下載邏輯收斂成共用工具

新增 `src/utils/download.ts` 的 `downloadFile(url, filename?)`：`fetch(url, { cache: 'no-store' })` 讀成 Blob → 同源 blob 網址 → `<a download>`；`fetch` 丟錯時退回 `window.open(url, '_blank', 'noopener')`；`!response.ok` 時丟 `DOWNLOAD_HTTP_<status>`。`cache: 'no-store'` 是因為 R2 對不帶 Origin 的回應沒有 `Vary: Origin`，`<img>` 先載過的快取沒有 CORS 標頭，被 fetch 重用會失敗。`LibraryView` 的批次下載一併改用它，HTTP 非 2xx 時顯示 `errors.downloadFailed`，不再把錯誤頁存成檔案。

### 參考強度送出前翻轉

畫面上的「參考強度」越高越貼近參考圖，後端 `strength` 越低越貼近，所以 `buildReq` 送出 `toBackendStrength(referenceStrength)`（`Math.round((1 - v) * 100) / 100`），保留 UI 文案「越高越貼近參考圖」。`seed` 走 `parseSeed`：`''` 省略（`type="number"` 的 v-model 會把 0 轉成數字 0，truthy 判斷會把 0 誤當空白），0 以上整數照送，負數與小數回 `null`、由畫面擋在送出前。這兩個轉換與行銷頁的 `mergePost`（換一張圖／重寫文案只換一半）放在 `src/utils/generation.ts`，因為 vitest 是 node 環境、沒有元件測試，抽成純函式才測得到。

### mock 與 real 同形

`mock.ts` 以 `MOCK_MODELS`（價格同後端）與 `priceOf(modelKey)` 取代 `POST_OUTPUT_TYPE_COST`；`generateImages` 依 `modelKey` 扣點、帶 `regenOf` 時只扣一張、找不到模型時丟 `MODEL_NOT_ALLOWED`；`generatePost` 依輸出類型扣 `marketingImage`／`marketingText` 並回傳 `poster`／`copy`；`db.adoptedResults`（`Set<string>`）模擬後端「同一張只算一次採用」，`db.imageGenerations` 只讓圖生圖的結果計入採用（同後端 `metrics_calc` 只算 `type='generate'`）；新增 `listInspirations` 回兩筆假素材。mock 的每個參數都要真的用到，否則 ESLint 會擋。

## Implementation Contract

**行為**

- 真後端模式：圖生圖頁掛載時送 `GET /feeds`（未載入時）與 `GET /ai-models?modelType=image`；行銷頁送 `GET /ai-models?modelType=marketing`，展開靈感時送一次 `GET /inspirations`。
- 付費請求帶 `Idempotency-Key`、timeout 100000；202 時每 `pollAfterMs` 打一次 `GET /generations/{id}`；生成結束（成功或失敗）後刷新餘額。
- 儲值彈窗在真後端模式一律顯示「這個環境尚未支援模擬儲值」。
- mock 模式：兩頁完整跑完，圖生圖 2 張標準檔扣 16；行銷 both／textOnly／imageOnly 扣 5／0／5。

**介面／資料形狀**：見 Decisions「介面改成後端欄位形狀」的對照表；real 內部的 wire 型別 `WireResult`、`WireOutput`、`WirePending`、`WireStatus` 只在 `real.ts` 內使用，不匯出。

**常數**：`PAID_TIMEOUT_MS = 100_000`、`PAID_MAX_ATTEMPTS = 3`、`PAID_RETRY_DELAY_MS = 5000`、`PAID_IN_PROGRESS_MS = PAID_TIMEOUT_MS + 20_000`、`POLL_MAX_MS = 11 * 60_000`。

**i18n（`src/lang/zh-Hant.ts` 與 `src/lang/en.ts` 同步，key 結構一致）**

| key                                                  | zh-Hant                                                                                          | en                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `errors.loadFailed`（新增）                          | 載入失敗，請重新整理頁面。                                                                       | Failed to load. Please refresh the page.                                                            |
| `errors.downloadFailed`（新增）                      | 下載失敗：檔案可能已過期或暫時無法讀取，請稍後再試。                                             | Download failed. The file may have expired or be temporarily unavailable. Please try again later.   |
| `image.brandDescription`（新增）                     | 品牌色票                                                                                         | Brand colors                                                                                        |
| `image.modelHint`（改）                              | 倍率以標準模型 {count} 顆／張為基準                                                              | Multipliers are based on Standard at {count} feed/image                                             |
| `image.resultHint`（改）                             | 結果只暫存 24 小時，按「存入圖庫」才會保留                                                       | Results are kept for 24 hours. Save to library to keep them.                                        |
| `marketing.steps.intro`（改）                        | 2. 文字內容                                                                                      | 2. Text                                                                                             |
| `marketing.introLabel`（新增）                       | 商品介紹（寫貼文用）                                                                             | Product description (for the post copy)                                                             |
| `marketing.posterTextLabel`（新增）                  | 海報上的文字（會印在圖上）                                                                       | Poster text (printed on the image)                                                                  |
| `marketing.posterTextPlaceholder`（新增）            | 例：春季新品\n限時 8 折                                                                          | e.g. Spring arrivals\n20% off                                                                       |
| `marketing.inspirationHint`（改）                    | 選一張當海報的版型與色調參考                                                                     | Pick one as a layout and color reference for the poster                                             |
| `errors.backgroundGenerationFailed`（新增）          | 這次生成沒有成功。若是內容被審核擋下，飼料不會退回，請修改描述後再試；實際扣點以右上角餘額為準。 | This generation did not succeed. If it was blocked by content moderation, the feed is not refunded… |
| `errors.generationStillProcessing`（新增）           | 生成時間異常地長，已停止等待（編號 {id}）。…                                                     | Generation is taking unusually long, so we stopped waiting (ID {id})…                               |
| `common.leaveWhileGenerating`（新增）                | 生成還在進行中，離開這一頁就拿不到這次的結果，飼料仍會照扣。確定要離開嗎？                       | Generation is still in progress… Leave anyway?                                                      |
| `image.seedInvalid`（新增）                          | 種子要填 0 以上的整數，或留空改用隨機。                                                          | The seed must be a whole number of 0 or more…                                                       |
| `marketing.retryOnly.imageOnly`／`.textOnly`（新增） | 只重做配圖／只重做文案                                                                           | Redo visual only／Redo copy only                                                                    |
| `marketing.partialFailed.image`／`.text`（新增）     | 配圖（文案）沒有成功（{reason}）。…請按「換一張圖」（「重寫文案」）。                            | The visual (copy) did not succeed ({reason})…                                                       |
| `taskCenter.imageCompleted`（新增）                  | 已完成・結果不會自動存入圖庫，請在圖生圖頁按「存入圖庫」                                         | Completed · Results are not saved automatically…                                                    |
| `taskCenter.notePrimary`（改）                       | 完成的影片會自動存入圖庫›影片，離開頁面不影響影片生成；圖生圖請留在頁面上等結果。                | …does not interrupt video generation. For images, stay on the page until the results appear.        |

**i18n 對齊檢查**：vue-tsc 不比對兩個語系檔的 key，改用下面這行（在前端根目錄執行）。改動前的基準是 zh-Hant 獨有 8 個 `editor.retouch.*` 鍵（既有問題，不在本 change 範圍）、en 獨有 0 個；改動後必須完全等於這個基準。

```bash
node --experimental-strip-types --input-type=module -e "const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?f(v,p+k+'.'):[p+k]);const [z,e]=await Promise.all(['zh-Hant','en'].map(async(n)=>new Set(f((await import('./src/lang/'+n+'.ts')).default))));console.log('onlyZh',[...z].filter(k=>!e.has(k)),'onlyEn',[...e].filter(k=>!z.has(k)))"
```

**失敗模式**

- 付費請求：見 Decisions「錯誤碼對應」；錯誤一律顯示在頁面既有的錯誤區（`p.err`），按鈕恢復可按。
- `feed.refresh()` 失敗時吞掉（`.catch(() => undefined)`），不覆蓋生成的錯誤訊息。
- 下載：`fetch` 失敗 → 開新分頁（仍記一次採用）；HTTP 非 2xx → 顯示 `errors.downloadFailed`。

**驗收**

- `npx vitest run` 0 failed；`src/api/real.spec.ts` 含 describe `GET /feeds`、`GET /ai-models`、`POST /prompt/enhance`、`POST /generate`、`generatePost（行銷）`、`生成結果：存入圖庫／下載事件／靈感`，`src/utils/download.spec.ts` 存在。
- 先讓它紅：在 `real.ts` 快照後分別把 key 產生移進迴圈、把 202 判斷改成恆假、讓 409 計入次數、把輪詢的暫時性判斷換回只認逾時與斷線，對應測試必須變紅，還原後全綠。
- `npx vue-tsc --noEmit`、`npm run lint`、`npx prettier --check <改動的檔案>` 皆 exit 0。
- `grep -rnE "IMAGE_BASE_COST|POST_OUTPUT_TYPE_COST|costPerImage|posterUrl|mock://poster|modelId|referenceId" src` 為 0 筆；`grep -c "Idempotency-Key" src/api/real.ts` ≥ 1。
- mock 模式煙霧測試（另開 `VITE_USE_MOCK=true npx vite --port 5174 --strictPort`，不停現有 dev server）與真後端免費路徑（`GET` 類請求、儲值不支援、圖庫下載回歸）通過。
- 實打 fal 的少量驗證（約 21 顆飼料）**需要使用者同意**才執行。

**範圍**

- In scope：proposal Impact 列出的檔案。
- Out of scope：`src/api/http.ts`、`src/stores/*.ts`（只改 `src/stores/stores.spec.ts` 的 mock 值）、`src/components/TopUpDialog.vue`、`src/views/TryOnView.vue`、後端任何檔案，以及 Non-Goals 列出的項目。

## Risks / Trade-offs

- [R2 暫存網址的 CORS 白名單只有 `http://localhost:5173`] → 開發環境可真的下載；另開的 :5174 與未加白名單的正式網域會退化成開新分頁（仍記一次 downloaded）。上線前要把正式網域加進 R2 CORS。
- [`crypto.randomUUID()` 只能在 https 或 localhost 使用] → 上線環境必須是 https；否則要補 fallback。
- [409 仍可能收尾] 第一發在後端以 5xx 收尾（已退點、佔位 300 秒才過期），或第一發被內容審核擋下而回應遺失 → 顯示後端訊息「前一次相同的請求還在處理中」；409 等到期限算結果不確定，key 留在 `openKeys`，同一份輸入在佔位 300 秒內再按仍會看到 409，之後同一把 key 會重新執行。發生機率低，只記錄。
- [`CONTENT_BLOCKED` 後原樣再按一次會再扣] 後端對審核擋下保留佔位不放 key（`_KEEP_THE_KEY`），但前端照「4xx 結果已確定」換新 key → 一字不改再送會再扣一次。沿用 key 的話會在 120 秒內一直等 409、最後顯示「還在處理中」，比再扣一次更難懂；改描述本來就是新的操作。之後若要擋，`isSettledFailure` 排除 `CONTENT_BLOCKED` 並另給 409 的訊息。
- [codex #2：202 的 generationId 沒有持久化] 重新整理、關分頁或輪詢逾時之後，就拿不回已扣點的結果 → 根治要做生成紀錄頁，需要後端提供列表端點或前端持久化 pending id，屬於產品決策；目前靠生成中離開前的確認減輕。
- [codex #4：前端沒保留 `expiresAt`] 結果只存在元件狀態、離開頁面就消失，所以 24 小時到期在同一個頁面生命週期內實際上碰不到；過期後存入會拿到後端 400，錯誤訊息照樣顯示 → 之後有生成紀錄頁（結果跨頁面留存）時再保留 `expiresAt`、到期前停用存入。
- [生成中離開頁面] 同步等待（最多 80 秒）與 202 輪詢期間離開，promise 仍在背景跑完、後端照樣結清，但結果只在頁面元件裡，沒有地方看（後端不會自動存進圖庫，也沒有生成紀錄頁）→ 兩頁以 `onBeforeRouteLeave`＋`beforeunload` 在生成中先確認（用原生 `window.confirm`，沒有另做對話框）；任務中心的圖生圖任務不再說「已存入圖庫」、拿掉「查看」與假的剩餘秒數。確認離開仍拿不到結果，要根治得做生成紀錄頁。
- [「文案＋配圖」時文案要等配圖] `Promise.allSettled` 等兩支都定案，配圖 202 時文案最久等 11 分鐘 → 刻意接受；要文案先出來得讓 `generatePost` 分兩段回傳。
- [後端值域錯誤只有籠統訊息] prompt 前端上限 500、後端 2000（AI 擴寫可能超過 500 但仍合法）→ 前端擋下「描述只有空白」「種子負數或小數」「換一張圖／重寫文案時欄位已清空」；重新生成時描述被清空仍會送出（後端回值域錯），不另處理。
- [ImagePickerDialog 沒有依 mediaType 過濾] 使用者可能選到影片當參考圖 → 後端大概回 502（已退點），這次不處理。
- [重新生成用的是當前表單] 改過描述或檔位後按重生，送出的是新設定 → 後端接受，維持現狀。
- [換帳號後餘額殘留、`onMounted` 的 `feed.refresh()` 沒有 catch] 既有問題 → 記錄，不在範圍。
- [用量頁「剩餘」寫死 1,240] 接上 `/feeds` 後與右上角真餘額不一致 → 記錄，用量頁不在範圍。
- [反向代理讀取逾時] nginx `proxy_read_timeout` 預設 60 秒短於後端 80 秒 → 閘道吐的 HTML 5xx（沒有 `requestId`）已改成同 key 重送，後端還在跑時拿 409 等回放，不會雙扣；但每次多等一輪，上線前仍要確認正式環境 ≥ 100 秒（設定不在兩個 repo 裡）。
- [價格沒載入仍能送出] 已改成所選檔位沒有價格時生成鈕停用、預估顯示「…」（行銷頁同理），避免畫面標 0 顆、後端照價扣點。行銷頁每個輸出類型只要求自己用到的單價（「只要文案」只看 `marketingText`、「只要配圖」只看 `marketingImage`）；後端沒回傳（`enabled=false`）的那一支，用到它的輸出類型卡片停用。沒有自動改選：預設的「文案＋配圖」若被停用，主按鈕停用，使用者要自己點可用的卡片。
- [`ALREADY_SAVED` 時拿不到素材 id] 回應遺失後再按一次，後端只回「已存過」→ `savedAssetId` 填 `'unknown'`，畫面只看它有沒有值；之後若要用到素材 id，改成重新查圖庫。
- [real 模式其他功能扣的是 mock 餘額] 修圖、加物件、圖生影、試穿仍從 `...mockApi` 繼承，扣的是 mock 的假餘額，右上角讀的是真 `GET /feeds` → 兩邊數字不會連動，mock 餘額耗盡時會跳「飼料不足」而真餘額充足。這些功能不在本 change 範圍，接上各自後端時一併消失；在那之前只記錄。
- [後端分支未合併] `feat/mv-07-metrics` 比 main 多 72 個 commit，後端合併內容一改就要重跑測試與驗收。
- [後端文件與程式碼不一致] v13.md 說 202 完成後同 key 重送會合成最終結果（程式沒實作，只回放 202）、`failed` 不一定退點、行銷價格文件寫 8／2（程式 5／0）、OpenAPI 沒宣告 `Idempotency-Key` → 本 change 一律照程式碼。

## Migration Plan

純前端改動，沒有資料遷移。部署順序：後端 `feat/mv-07-metrics` 先上線 → 前端再上。回滾：把 `VITE_USE_MOCK` 設回非 `false` 即回到 mock，或 revert 前端 commit。

## Open Questions

以下都已採用預設值實作，改起來都在一兩個常數或字串內：

- 輪詢上限：採用預設值 11 分鐘，待產品確認。後端背景續問上限 600 秒、從 202 起算，到期後還要取結果與存 R2；後端文件建議 2 分鐘，但前端沒有生成紀錄頁，停太早使用者會拿不到已扣點的結果。
- 行銷頁輸入：採用預設值「商品介紹與海報文字拆成兩欄，依輸出類型顯示」，待產品確認。替代做法（同一段文字餵兩支）會把整段商品介紹印到海報上，不建議。
- 靈感素材的 `promptTemplate`：採用預設值「不回填，只帶 `inspirationId`」，待產品確認（後端不讀這一欄，文件前後矛盾）。
- 參考強度方向：採用預設值「送出 1 − 滑桿值，保留文案越高越貼近參考圖」，待產品確認。
- 參考強度預設值：2026-09-19 使用者實測，預設 0.5（送 `strength` 0.5）時描述與參考圖無關的生成幾乎照抄參考圖（三檔都是 image-to-image 去噪模型），改為預設 0.3（送 0.7）並在說明文字提示「描述和參考圖無關時請調低」。參考圖必填是後端契約 v10 的定案，「純文字生圖」另提後端變更提案，不在本 change 範圍。
- 儲值：採用預設值「真後端模式停用」，待產品確認是否改接後端 `POST /feeds/topup`（不收錢的模擬儲值，接上等於任何登入者都能免費加飼料）。
- 圖生圖品牌開關：採用預設值「維持預設開啟並照開關送 `useBrand`」，待產品確認（以前不送、後端預設 false，這是行為改變）。

## 與既有規格的關係

本 change 只新增 capability，不寫 MODIFIED delta，避免與尚未歸檔、同樣修改 `marketing-post-ui` 的 add-marketing-post-output-type 在歸檔時互相覆蓋。以下既有描述會被本 change 的行為取代，歸檔本 change 時要一併改寫正式規格：

- `marketing-post-ui`「提供探索靈感素材入口」的說明「依商品類別給文案風格建議」→ 改為「選一張當海報的版型與色調參考」（靈感只影響海報）。
- `marketing-post-ui`「設定區依序引導生成」的第二步「商品介紹」→ 改為「文字內容」（商品介紹＋海報文字兩欄）。
- add-marketing-post-output-type 的價格 5／2／3 → 改為讀後端，目前為 5／0／5。
