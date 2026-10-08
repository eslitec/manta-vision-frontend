## Context

四條問題的共同根因：帳號範圍的狀態與進行中的請求沒有綁在「送出當下的登入身分」上。既有程式已有兩種做法可沿用：`brand`／`consent` store 用 inflight 物件比對、`generationTasks` store 用 `epoch` 計數（`restoreVideoTasks`）。

盤點全部 stores 與 composables 的模組級／store 級狀態：

| 狀態                                                           | 帳號範圍       | 修改前登出有沒有清                        |
| -------------------------------------------------------------- | -------------- | ----------------------------------------- |
| `session`（session、bots、namesLoaded）                        | 是             | 有（`loadSeq`）                           |
| `brand`（profile）                                             | 是             | 有                                        |
| `consent`                                                      | 是             | 有                                        |
| `generationTasks`（tasks、timers、toast）                      | 是             | 有；但 `createVideoTask` 的晚到回應沒防護 |
| `feed`（餘額、月用量、loaded）                                 | 是             | **沒有**                                  |
| `useAssets` 模組級 folders／unfiledCount／foldersLoaded        | 是（綁機器人） | **沒有**                                  |
| `real.ts` 的 `openKeys`                                        | 是             | **沒有**                                  |
| `models`（AI 模型目錄）                                        | 否（全站目錄） | 不需要                                    |
| `http.ts` 的 `ctx`                                             | 是             | 有（`clearAuth`）                         |
| 其餘 composables（對話框、拖曳、編輯歷史）與各頁面元件內的 ref | 元件生命週期   | 登出導回登入頁時隨元件卸載                |

## Goals / Non-Goals

**Goals:**

- 登出後同一分頁換帳號，看不到也扣不到上一個帳號的東西。
- 202 受理後輪詢沒定案時，同輸入重試不再扣一次。

**Non-Goals:**

- 跨重新整理的恢復、生成紀錄頁、取消已送出的請求、後端改動。

## Decisions

### 清理集中在 session.discard，各自以 epoch 丟棄晚到回應

`feed.$reset()` 與 `resetFolders()` 各自把 epoch 加一並清空狀態；`refresh()`／`loadFolders()` 在 await 前記下 epoch、回來時不符就不寫。沿用 `generationTasks` 既有寫法，不另立共用抽象（只有兩處）。

### 付費流程以「token＋botId」當身分，而不是 session epoch

後端冪等範圍含 Authorization 與 X-Bot-Id 的指紋（`app/idempotency.py` `_scope`），所以「身分有沒有變」的正確判準就是這兩個值；`real.ts` 直接讀 `http.ts` 的 `ctx`，不必讓 api 層反向依賴 store。比對放在共用的 `postPaid` 迴圈開頭與 `pollGeneration` 每輪送出前，全部付費端點（/generate、/marketing/*、/tryon、/edit、/video）一次涵蓋。

### 202 保留 key 由旗標決定，定案才丟

`postPaid(url, body, op, pendingOn202)`：只有 `runGeneration` 帶 `true`。`runGeneration` 輪詢到 `done` 或 `GENERATION_FAILED` 才刪 key；404、`GENERATION_STILL_PROCESSING` 等保留。保留期間同輸入重送帶同一把 key，後端 `_replay_pending` 回放同一個 202，前端接回去輪詢同一個 `generationId`。影片直接呼叫 `postPaid`（不帶旗標），202 照舊刪 key。

## Risks / Trade-offs

- 後端原本只記 202 到 `idempotency_pending_ttl_seconds`（900 秒）；後端 `afbaeed`（10/2）已改為 24 小時（`idempotency_ttl_seconds`），保護窗不再受前端輪詢上限影響。剩下的上限是 key 只存在記憶體：重新整理或重新登入換 token 後接不回去。程式內以 `ponytail:` 註解標明。
- 輪詢回 404 後 key 保留：同輸入重試會一直接回同一個 `generationId`（再 404），直到後端的 202 紀錄過期（最長 24 小時）。取「不重複扣點」優先；改一個字就是新操作。
- 登出後用**新 token** 重新登入同一帳號，後端冪等範圍已不同，舊 key 本來就擋不住——這是後端範圍設計，前端以登出清 key 對齊。
- `feed.applyTopUp` 由元件在 `await api.topUp` 之後呼叫，沒有 epoch 防護；真後端模式儲值停用，暫不處理。
