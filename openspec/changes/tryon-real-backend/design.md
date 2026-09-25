## Context

試穿頁（`src/views/TryOnView.vue`）改動前：`api.tryOn()` 無參數、mock 扣 15 回 `{ ok }`；同意走 mock 記憶體；`uploadedModels` 是元件狀態（重新整理消失）＋兩列示範資料；估價寫死 12；結果區只顯示文字；`saveGenerated` 不帶 `from`（real 版落 mock）；下載與條款 PDF 是 TODO；有 `BrandToggle`。

後端契約以 manta-vision-backend `feat/tryon` 分支的**程式碼**為準（`app/routers/generation.py` `/tryon`、`app/routers/users.py`、`app/schemas/generation.py`、`app/schemas/user.py`、`app/schemas/image.py`、`app/services/generation.py::generate_tryon`），docs/api/v14.md #17／#24／#25／#4 為輔：

- `POST /tryon`（paid，`Idempotency-Key`、`X-Bot-Id`）body `{ modelSource: 'material' | 'upload', modelRefId, clothImageId }`；200 與 `/generate` 同形（`generationId`、`results[{ resultId, tempUrl, expiresAt, width, height }]`、`durationMs`、`costFeeds`、`balance`）；逾時 202 → `GET /generations/{id}`；403 `CONSENT_REQUIRED`（`upload` 來源且該使用者 `portraitConsent=false`，擋在扣點前）；404 模特／衣服不存在或非本 bot；402／409 由共用管線；無 `prompt`、`useBrand`、`modelKey`、`regenOf`。模型固定取 `modelType=tryon` 且啟用的那一列（`tryonStandard`，12 顆）。
- `GET /users/me/consent` → `{ portraitConsent }`；`PUT /users/me/consent` body `{ consent: true }` → `{ portraitConsent: true, updatedAt }`（`false` 回 400，沒有撤回）。user-scoped，不看 `X-Bot-Id`。
- 模特照：`POST /upload` 帶 `source=tryonModel`；`GET /images?source=tryonModel` 只回模特照（回應 `source: 'tryonModel'`，`counts` 算進 `upload`）；同一 bot 第 21 張回 400 `VALUE_OUT_OF_RANGE`；刪除 `DELETE /images/{id}`。
- `POST /generations/{id}/save` 來源標 `tryon`；`POST /generations/{id}/events` 的 `record_adoption_event` 只查 `GenerationLog.id`＋`bot_id`，不看 `type`——試穿結果的下載事件照送。

前端限制同 generation-real-backend：`api` 型別是 `typeof realApi | typeof mockApi`，兩邊簽名要一致；沒有 `@vue/test-utils`，行為測試集中在 API 層，view 由 mock 與真後端冒煙覆蓋。

## Goals / Non-Goals

**Goals:**

- `VITE_USE_MOCK=false` 時試穿頁每個動作都打真後端；一次點擊最多扣一次點；202 也拿得到結果。
- mock 模式跑得完整個流程（同意 → 上傳模特照 → 選內建模特＋服飾 → 試穿 → 結果圖＋存入／下載 → 餘額扣 12）。
- 沿用圖生圖頁既有機制（`runGeneration`、`toGeneratedImage`、`saveGenerated`、`downloadFile`、`listModels`、離開確認），不新增依賴。

**Non-Goals:** 見 proposal.md。

## Decisions

### modelRefId 的來源與選取狀態

模特有兩種來源，各自一個選取 ref：內建分頁 `model`（`materialId`，來自 `GET /materials?category=model`，載入後預選第一位）、上傳分頁 `uploadedModel`（`imageId`，來自 `GET /images?source=tryonModel` 或 `POST /upload` 的回應，上傳成功自動選中、刪除時若刪的是選中那張則清空）。送給後端的 `{ modelSource, modelRefId }` 由 `modelRef` computed 依**目前分頁**決定：`builtIn` → `material`＋`model`，否則 `upload`＋`uploadedModel`。使用者切分頁就是在切來源，不必另做「當前模特」的跨分頁狀態。

替代方案：單一 `selected = { source, id }` 跨分頁記住最後點的那個——切回內建分頁時畫面高亮與實際送出的模特會對不上，否決。

### 202 輪詢與冪等鍵沿用 runGeneration

`tryOn` 直接呼叫 `runGeneration('/tryon', req)`：`postPaid` 給 `Idempotency-Key`、100 秒逾時、只在不確定送達時重送；202 由 `pollGeneration` 每 `pollAfterMs` 打 `GET /generations/{id}` 直到 `done`／`failed`。403／404 是 4xx，不重送、key 放掉。`results[]` 固定一張，`results[0]` 經 `toGeneratedImage` 翻成 `GeneratedImage`；沒有 `results[0]` 時丟 `UNEXPECTED_RESPONSE`（不讓畫面拿到 `undefined` 當成功）。

### 同意：後端為真相，403 時本機狀態回退

掛載時 `consentStore.load()`（`GET /users/me/consent`，`loaded` 後不重打）；視窗「我知道了」→ `PUT`。`POST /tryon` 回 403 `CONSENT_REQUIRED` 時把 `consented` 設回 `false` 並開視窗，不當成生成失敗——本機快取可能過期（換帳號、後端資料被改）。前端的同意檢查仍對兩種來源都做（沿用既有要求「生成前需完成肖像同意」），後端只對 `upload` 來源守門，內建模特多一道前端檢查無害。

視窗內容改顯示品牌設定的 `portraitConsent`（brand store `load()` 已在空值時補 i18n 預設文案；store 還沒載入前 computed 也 fallback 同一段），`white-space: pre-line` 保留換行；拿掉寫死的四條條款與「下載條款 PDF」。

### 模特照持久化：source=tryonModel

上傳帶 `source='tryonModel'`（`uploadImage` 第 5 個選填參數，`useAssets.upload` 原樣轉發；既有呼叫端不帶＝行為不變）；掛載時 `GET /images?source=tryonModel&pageSize=20` 撈回清單。20 只是顯示用常數（`MODEL_PHOTO_LIMIT`），擋不擋由後端 400 決定，錯誤訊息直接顯示後端 `message`（`displayMessage`）。後端沒有審核，清單型別只剩 `{ id, name, url? }`。

替代方案：前端擋第 21 張——後端才是規則來源，前端擋會在後端調整上限時失真，否決。

### 價格與採用事件

估價讀 `GET /ai-models?modelType=tryon` 的第一列 `costFeeds`（後端只回啟用的檔位），載入前顯示「…」且停用生成鈕（同圖生圖頁 `perImage === undefined`）。下載後送 `recordAdoption`：後端 `record_adoption_event` 不看生成類型，MV-07 的採用率才算得到試穿的下載。

## Risks / Trade-offs

- `saveGenerated` 的 `from` 改必填：所有呼叫端都是生成結果，沒有其他情境；`useAssets.spec`／`mock.spec` 同步改。
- 兄弟 change `tryon-model-upload-real-backend` 的 delta 寫「SHALL NOT 帶 `source`」，與本 change 相反；兩者都未歸檔，歸檔順序先它後本 change，本 change 的「模特照持久化」要求覆蓋之。
- 面板「我已取得此人肖像使用同意」勾選仍是純顯示（不送後端）；後端只有一個 user-level 同意。

## Implementation Contract

**i18n 對齊檢查**（在前端根目錄執行，結果必須等於基準：zh-Hant 獨有 8 個 `editor.retouch.*`、en 獨有 0）：

```bash
node --experimental-strip-types --input-type=module -e "const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?f(v,p+k+'.'):[p+k]);const [z,e]=await Promise.all(['zh-Hant','en'].map(async(n)=>new Set(f((await import('./src/lang/'+n+'.ts')).default))));console.log('onlyZh',[...z].filter(k=>!e.has(k)),'onlyEn',[...e].filter(k=>!z.has(k)))"
```

**i18n 變更表**

| key                     | zh-Hant                                                | en                                                           |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `sources.tryonModel`    | 模特照                                                 | Model photo                                                  |
| `tryOn.resultHint`      | 結果只暫存 24 小時，按「存入圖庫」才會保留             | Results are kept for 24 hours. Save to library to keep them. |
| `tryOn.terms.intro`     | …以下為品牌設定的條款模板…                             | …The template below comes from your brand settings…          |
| 刪除                    | `tryOn.upload.available`／`reupload`／`notes.*`、`tryOn.demoModels`、`tryOn.generated`、`tryOn.terms.items`／`more`／`download` | 同左 |
