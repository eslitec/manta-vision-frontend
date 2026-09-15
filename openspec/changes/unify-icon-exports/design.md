## Context

`src/components/icons/` 目前有 34 個 icon 元件，每個都是獨立的 `.vue` 檔案並各自用 `export default` 匯出。20 個消費端檔案（元件與頁面）目前都是逐行 `import IconXxx from '@/components/icons/IconXxx.vue'`，用到多個 icon 的檔案就要寫多行幾乎相同的敘述。專案裡已經有三個手寫 barrel 前例：`src/api/index.ts`、`src/lang/index.ts`、`src/router/index.ts`，都是手寫具名 re-export，沒有自動產生工具。

## Goals / Non-Goals

**Goals:**

- 新增一個手寫 barrel（`src/components/icons/index.ts`），讓所有 icon 元件都能從單一模組路徑具名匯入。
- 把 20 個既有消費端檔案全部改成從這個 barrel 具名匯入，取代逐檔案 default import。

**Non-Goals:**

- 不重新命名任何既有 icon 元件、不搬移 icon 檔案位置。
- 不引入 `import.meta.glob` 或任何自動產生 barrel 內容的工具。
- 不新增 lint 規則或建置期腳本檢查 barrel 內容與 icon 目錄是否同步。
- 不擴大到 `src/components/icons/` 以外的其他元件目錄。

## Decisions

### 決策 1：barrel 採手寫具名 re-export，不用 import.meta.glob

`import.meta.glob('./Icon*.vue', { eager: true })` 可以動態組出一個 path-keyed 物件，但消費端只能寫成 `icons['./IconAddObject.vue'].default`，沒辦法達成 `import { IconAddObject } from '@/components/icons'` 這種具名語法。手寫具名 re-export（`export { default as IconAddObject } from './IconAddObject.vue'`）是唯一能滿足具名 import 需求的做法，而且跟專案既有的 `src/api/index.ts`、`src/lang/index.ts`、`src/router/index.ts` 三個 barrel 前例風格一致。

### 決策 2：一次遷移全部 20 個消費端檔案，不分批留存兩種寫法

如果只新增 barrel、不遷移既有檔案，專案會同時存在「逐檔案 default import」與「barrel 具名 import」兩種寫法，之後新增程式碼時無法判斷該照哪一種寫，達不到「統一」的目的。因此本次一次把 20 個消費端檔案全部改完，不分階段。

### 決策 3：不加自動化防呆，靠 TypeScript 編譯錯誤擋新增 icon 漏補 barrel

新增 icon 元件時如果忘記在 barrel 補上對應的具名 re-export，任何消費端對該 icon 的具名 import 會直接觸發 TypeScript 編譯錯誤（`Module '"@/components/icons"' has no exported member`），錯誤發生在編譯期、訊息明確指出缺少的匯出名稱，足以攔下遺漏，不需要另外寫 lint 規則或建置期腳本比對兩邊清單。

## Implementation Contract

**行為**：`src/components/icons/index.ts` 建立後，`npm run build`（`vue-tsc --noEmit` + `vite build`）SHALL 通過；20 個消費端檔案裡原本逐行匯入個別 `.vue` 檔案的 import 陳述式 SHALL 全部替換成從 `@/components/icons` 具名匯入同一批 icon 名稱，替換前後每個檔案實際使用的 icon 元件名稱與數量 SHALL 完全相同（純粹改寫 import 來源，不新增、不刪除任何 icon 的使用）。

**介面 / 資料形狀**：`src/components/icons/index.ts` 對現有 34 個 icon 元件各輸出一行 `export { default as <IconName> } from './<IconName>.vue'`，`<IconName>` SHALL 與檔名（去掉 `.vue`）完全一致。

**失敗模式**：新增 icon 元件卻忘記在 barrel 補上對應 re-export 時，消費端的具名 import 會在 TypeScript 編譯期失敗（`vue-tsc --noEmit` 報錯），不會是執行期靜默失敗。

**驗收標準**：
- `npm run build` 通過（`vue-tsc --noEmit` 型別檢查 + `vite build`）。
- `npm run lint` 通過。
- 對 20 個消費端檔案逐一執行 `grep "from '@/components/icons/Icon"`（直接指向個別 `.vue` 檔案路徑的 import），結果 SHALL 為空。
- `src/components/icons/index.ts` 的具名匯出數量 SHALL 等於 `src/components/icons/` 底下 icon 元件檔案數量。

**範圍邊界**：僅涵蓋 `src/components/icons/` 底下的 icon 元件與本次列出的 20 個消費端檔案；不包含 icon 元件本身的實作內容、其他元件目錄，或新增/刪除任何 icon。

## Risks / Trade-offs

- [風險] 遷移 20 個檔案是機械式但範圍廣的改動，逐一手動修改容易漏改某個檔案裡的某一個 icon import → [緩解] 完成後用 `grep "from '@/components/icons/Icon"` 掃描全部 20 個檔案確認歸零，並跑 `npm run build` 讓 TypeScript 抓出任何遺漏或名稱打錯的具名匯入。
- [風險] barrel 手寫維護，未來新增 icon 若忘記補匯出行，會在使用到該 icon 的地方才第一次被編譯錯誤攔下，而不是在新增當下 → [緩解] 這是本次決策 3 刻意接受的取捨（不新增自動化防呆），编译错误訊息已足夠明確指出缺少的匯出名稱。
