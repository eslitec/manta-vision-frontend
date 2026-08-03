# Manta Vision — 後端串接說明（交接給後端）

前端（Vue 3）已把所有畫面與流程做成呼叫一層 API 服務。目前那層是 **mock（假後端）**，讓前端可端到端運作。後端把下列端點做出來、再把 mock 換成真實 http 實作即可。

## 唯一切換點

`src/api/index.ts`

```ts
import { mockApi } from './mock'
export const api = mockApi   // ← 後端就緒後改成打 http 的實作
```

- 型別合約：`src/types/api.ts`、`src/types/asset.ts`
- axios 實例與攔截器（已帶 `X-Bot-Id`、Bearer token）：`src/api/http.ts`
- 假後端與各函式簽章（＝合約範例）：`src/api/mock.ts`

多租戶：所有請求都帶 `X-Bot-Id`；資料一律依 `bot_id` 隔離。

## 端點合約

| 建議端點 | 對應 mock 函式 | 說明 |
| --- | --- | --- |
| `GET /models` | `listModels` | 圖生圖可用模型清單＋每模型 `costPerImage`（單張飼料） |
| `GET /feed` | `getFeed` | 帳號共用錢包餘額 |
| `GET /images` | `listImages` | 依 bot_id 的素材清單（含 `folders` 字串陣列） |
| `POST /images`（上傳） | `uploadImage(file, folder?)` | **multipart/form-data**（欄位 `file`）；存 R2、回素材（source=上傳）；`folder` 未帶則進「未分類」 |
| `POST /images/edit` | `editImage` | 去背／修圖：非破壞、產 source=編輯產物 新素材 |
| `GET /folders` | `listFolders` | 依 bot_id 的資料夾清單（字串陣列） |
| `POST /folders` | `createFolder` | 新增資料夾（同名去重）；回傳最新清單 |
| `PATCH /images/folders` | `addToFolder(assetIds, folder)` | 把既有素材加入資料夾（**多重歸屬**、去重，不影響原本歸屬） |
| `POST /images/save` | `saveGenerated` | 存入圖庫（選用）：生成結果落地成 source=AI 生成 素材、記錄來源鏈 |
| `POST /generate/image` | `generateImages` | 依 `modelId` 路由各大模型、依 模型×張數 扣飼料；有 `referenceId` 走 img2img；帶進階參數 `referenceStrength`／`negativePrompt`／`seed`（見下方） |
| `POST /prompt/enhance` | `enhancePrompt` | AI 輔助描述：把口語擴寫成結構化 prompt（後端接 LLM；支援中文） |
| `POST /generate/post` | `generatePost` | 產形象貼圖＋文案；套品牌設定、避免用詞硬性過濾、扣一次；圖採「商品錨定」流程（見下方）；帶 `ratio` |
| `POST /generate/video` | `createVideoJob` | 建立非同步任務、扣 45 |
| `GET /generate/video/:id` | `getVideoJob` | 查狀態（queued/processing/done/failed）；失敗退點；done 推播通知中心 |
| `POST /generate/tryon` | `tryOn` | 試穿合成、扣點 |
| `POST /events/adoption` | `recordAdoption` | 採用＝下載 or 存入圖庫任一（同張去重）；只算圖生圖 |
| `GET /usage` | `getUsage` | 用量彙總（全公司加總）；含 `generatedThisMonth`（本月已生成張數，首頁用） |
| `GET /metrics` | `getMetrics` | 成功率、採用率、平均重生成、每採用成本 |
| `GET /brand`・`PUT /brand` | `getBrand`／`saveBrand` | 品牌設定 CRUD（依 bot_id）；含 `logoUrl`（mock 為 data URL，後端改：Logo 走檔案上傳存 R2、`logoUrl` 存 R2 網址） |
| `GET /consent`・`POST /consent` | `getConsent`／`giveConsent` | 肖像同意（綁 Account、全站一次） |

## 貫穿規則（重點）

- **飼料計費**：生成前檢查餘額、生成後扣點（各模組費率不同）；**生成失敗要退點**；月上限＋80% 告警；上限用罄擋下旗下所有機器人。（ADR-0001）
- **生成執行**：**只有圖生影非同步**（任務佇列＋狀態機＋完成推播通知中心）；其他同步。若某模組穩定超過 120 秒，改非同步。（ADR-0002，待 Mavis 再確認）
- **採用**：下載 or 存入圖庫任一都算採用（去重）；**只有圖生圖有採用概念**。
- **素材維度**：`來源`（tag：上傳／物件素材／AI 生成／編輯產物／影片）與 `folders`（使用者歸檔）是**兩個獨立維度**，可同時過濾；勿混用。資料夾為**多對多**（一張素材可同屬多個資料夾，像相簿／標籤），後端建議用關聯表。素材來源可為「本地上傳」或「從既有素材庫加入」，兩者都只是把某資料夾名稱加進該素材的 `folders`。
- **品牌設定**：只有行銷 PO 文帶入。
- **租戶**：帳號:機器人＝1:1（現在），獨立表＋bot_id 預留 1:N。（ADR-0003）

## 行銷 PO 文產圖流程（`generatePost` 內部，重點）

圖**不是憑空生成**，而是以「使用者上傳的商品圖」為錨，讓商品維持真實、風格跟著品牌走（電商必要）。建議流程：

1. **組 prompt（LLM 當導演）**：讀 `intro`（主題）＋品牌設定（`applyBrand` 時依 `bot_id` 取色票／語氣／風格）→ 產出 image prompt（情境、光線、風格）與一句短主標（3–7 字）。同一次也產文案與 hashtag，確保**圖文同調**。
2. **商品錨定合成**：`productImageId` 的商品圖**去背** → 放進依 prompt 生成的品牌情境背景（或套海報模板）。商品本身不得被模型亂改。
3. **套品牌識別**：疊 Logo／浮水印、品牌色；主標文字**極簡**（避免整張塞字，參考廣告平台建議）。
4. **依 `ratio` 輸出**（1:1／4:5／9:16／16:9）：比例影響構圖；回傳 `posterUrl`（或各比例多版）。

輸入訊號一覽：商品圖（錨）、`intro`（主題）、品牌設定（風格/色/Logo，依 bot_id）、`ratio`（版位）、避免用詞（護欄）。前端已把這些收齊並送出。

## 圖生圖產圖流程（`generateImages` 內部，重點）

與 PO 文**不同**：這是**純生成**，無商品錨定、**不套品牌設定**、無短主標疊字。核心是「模型路由＋參考圖條件＋prompt」。

1. **模型路由**：依 `modelId` 路由到對應大模型（Nano Banana／FLUX／DALL·E…）的 API；每模型單價 `costPerImage` 由 `GET /models` 提供，前端據此估價、後端據此扣點。
2. **參考圖條件**：有帶 `referenceId` → 走 **img2img**（以參考圖為條件生成，可調參考強度）；沒帶 → 純 **text-to-image**。
3. **prompt 驅動**：`prompt` 為主要輸入；「AI 輔助描述」把口語需求擴寫成完整 prompt（可前端或後端做）。
4. **進階設定（已接線並進 `GenerateImageReq`）**：`referenceStrength`（0..1，img2img 越低越貼近參考圖）、`negativePrompt`（不希望出現的元素）、`seed`（固定可重現、未帶＝隨機）。「AI 輔助描述」呼叫 `enhancePrompt`（後端接 LLM prompt enhancer）。
5. **張數與計費**：一次產 `count` 張（目前 2／4），扣 `costPerImage × count`；**生成失敗要退點**。
6. **採用**：只有此模組有採用概念——下載 or 存入圖庫任一都算（去重）。

## 待雙方拍板

1. `GET /models` 的實際模型清單與各自 `costPerImage`。
2. 採用／自動入庫最終版：前端採「下載或存入圖庫任一＝採用、且要手動存入」，請與後端既有文件對齊。
3. ADR-0002（只有圖生影非同步）推翻了 Mavis 已核准的「全部非同步」，需再確認。

## 相關文件（Notion）

開發功能清單（含使用情境／圖解）、術語表、Spec（PRD）、ADR-0001～0003、技術棧與開發規範、前後端分工總表。
