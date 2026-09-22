## 1. 資料層

- [x] 1.1 落地設計決策「決策 1：名稱優先序與空白期」與「決策 2：載入時機掛在 session store 的 `adopt()`，清除掛在 `discard()`」：`src/stores/session.ts` 新增 `bots`、`namesLoaded`、`botName`（computed）；`adopt()` 觸發 `Promise.allSettled([api.listBots(), brand.load()])` 並用遞增序號擋過期回應；`discard()` 清 `bots`、`namesLoaded` 並呼叫 brand store `reset()`；`src/stores/brand.ts` 的 `load()` 共用進行中的請求、新增 `reset()`。驗證：`npx vue-tsc --noEmit` exit 0
- [x] 1.2 `src/stores/stores.spec.ts` 補測試：名稱優先序（brand name → botName → 預設「我的品牌」）、載入前為空字串、API 失敗仍退回預設且不 reject、登出清空 `bots` 與 brand profile；brand store 並行 `load()` 只打一次 `getBrand`、`reset()` 後的舊回應不寫入。驗證：`npx vitest run src/stores` 全綠；把 `botName` 的 brand 優先改壞、把 in-flight 去重拿掉後各至少一條轉紅，cp 快照還原後轉綠

## 2. 畫面與 i18n

- [x] 2.1 對齊 Requirement「側欄與麵包屑顯示目前機器人名稱」與 Requirement「頂部工具列顯示目前情境與使用者身分」並落地「決策 3：元件只讀 store」：`DefaultLayout.vue` 側欄與麵包屑第一段改讀 `session.botName`。驗證：`grep -n "brand.name" src/layouts/DefaultLayout.vue` 為 0 筆
- [x] 2.2 對齊 Requirement「頁面標示所屬機器人情境」：`zh-Hant.ts`／`en.ts` 的 `imagePicker.subtitle` 與 `library.note` 改帶 `{name}`，`ImagePickerDialog.vue` 與 `LibraryView.vue` 傳入 `session.botName`；`brand.name` 改「我的品牌」／「My brand」。驗證：`grep -rn "日安選物\|Good Day Select" src/lang` 為 0 筆；i18n 葉節點差集維持基準

## 3. 驗證與收尾

- [x] 3.1 `npx vitest run` 0 failed；`npx vue-tsc --noEmit`、`npx eslint .` exit 0；`npx prettier --check` 改動檔通過
- [x] 3.2 真後端瀏覽器實測（puppeteer-core，:5173）：登入後 `GET /api/bots` 與 `GET /api/brand` 各一發；側欄與麵包屑顯示品牌設定名稱；清空品牌名稱存檔後退回 `botName`（「我的機器人」）；圖庫提示與圖片選擇器副標帶同一名稱；重新整理後名稱仍在；登出再登入另一帳號名稱會換；截圖存 scratchpad/botname/；結束無殘留 headless Chrome；不呼叫扣點端點
- [x] 3.3 `spectra validate bot-name-real-backend` 與 `spectra analyze bot-name-real-backend` Coverage／Consistency／Gaps 皆 0
