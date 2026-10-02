## Context

`t('brand.name')` 用在 `src/layouts/DefaultLayout.vue:8`（側欄）、`:31`（麵包屑第一段）、`src/views/BrandSettingsView.vue:26`（品牌名稱輸入框 placeholder）；`zh-Hant.ts` 的 `imagePicker.subtitle`（`ImagePickerDialog.vue:62`）與 `library.note`（`LibraryView.vue:550`）把「日安選物」寫在句子裡，`en.ts` 對應 key 同樣寫死。

後端契約：

- `GET /bots`（帳號層，不帶 `X-Bot-Id`）：`{ items: [{ botId, botName, createdAt }] }`，`createdAt` 正序，第一筆＝登入回的 `botId`；註冊預設 `botName`「我的機器人」；沒有改名 API。`realApi.listBots` 已存在但無人呼叫；`mockApi.listBots` 回 `[{ botId: 'bot_demo', botName: '日安選物' }]`。
- `GET /brand`：`name` 可為 `null`／空字串。brand store 已有 `load()`（有 profile 就不重打）。
- session store（`src/stores/session.ts`）在 `adopt()` 收下登入／註冊／還原的 session；`discard()` 是登出與 forceLogout 的共同出口。

## Goals / Non-Goals

**Goals:**

- 側欄、麵包屑、圖片選擇器副標、圖庫提示四處顯示同一份真名稱。
- 名稱只在登入成功與 app 啟動（有 token）時各取一次，元件不各自呼叫。
- 取名稱失敗不擋操作、不顯示錯誤；mock 模式照常可用。

**Non-Goals:**

- 不做機器人切換器、不改機器人名稱。
- 不動頂欄「擁有者」與麵包屑第二段。

## Decisions

### 決策 1：名稱優先序與空白期

`session.botName`（computed）＝

1. 兩支 API 都還沒結束（`namesLoaded === false`）→ `''`（畫面留空白，不閃預設字串）。
2. brand store 的 `profile.name` 非空 → 用它。
3. 否則 `bots` 裡 `botId === session.botId` 那筆的 `botName` 非空 → 用它。
4. 否則 `i18n.global.t('brand.name')`（改成中性的「我的品牌」／「My brand」）。

失敗視同「沒有值」：`GET /bots` 失敗 → `bots` 維持 `[]`；`GET /brand` 失敗 → `profile` 維持 `null`；兩者都失敗仍走到第 4 步，不顯示錯誤。

### 決策 2：載入時機掛在 session store 的 `adopt()`，清除掛在 `discard()`

`adopt()` 是登入、註冊、還原三條路徑的共同出口，在這裡 `void loadNames()` 一次（`Promise.allSettled([api.listBots(), brand.load()])`），正好對應「登入成功後」與「app 啟動有 token 時」各一次；`discard()` 是登出與 forceLogout 的共同出口，在這裡把 `bots` 清成 `[]`、`namesLoaded` 設回 `false`、brand store `profile` 設回 `null`，換帳號登入時不會殘留上一個人的名字。不新增 store：`bots` 放 session store（它本來就持有 `botId`），品牌名稱直接讀既有 brand store（`BrandSettingsView`／`HomeView` 已在用）。brand store 的 `load()` 原本只在 `profile` 已有值時跳過，擋不住「session store 與首頁同時呼叫」的兩發並行（真後端實測登入後 `GET /brand` 打了兩次），改成共用同一個進行中的請求（in-flight memo）；新增 `$reset()` 給 `discard()` 用：清 `profile`、作廢進行中的請求，reset 之後才回來的舊帳號回應不寫進 `profile`。

### 決策 3：元件只讀 store

`DefaultLayout.vue` 兩處、`ImagePickerDialog.vue` 副標、`LibraryView.vue` 提示都改讀 `session.botName`；後兩者的 i18n 字串改成 `{name}` 參數。`BrandSettingsView.vue` 的 placeholder 維持 `t('brand.name')`，因為該 key 已改成中性字串。

## Implementation Contract

- 行為：登入成功 → Network 出現 `GET /api/bots` 與 `GET /api/brand` 各一發；重新整理（有 token）→ 再各一發；側欄與麵包屑第一段顯示品牌設定名稱，品牌名稱清空存檔後顯示該帳號的 `botName`（新帳號為「我的機器人」）；圖庫提示與圖片選擇器副標帶同一名稱；登出後登入另一帳號名稱會換。
- 介面：`useSessionStore()` 新增 `bots: Ref<Bot[]>`、`botName: ComputedRef<string>`；其餘既有介面不變。
- 驗收：
  - `npx vitest run` 0 failed（基準 217）；`npx vue-tsc --noEmit`、`npx eslint .` exit 0；`npx prettier --check` 改動檔通過；i18n 葉節點差集維持基準（zh-Hant 多 8 個 `editor.retouch.*`，en 0）。
  - `src/stores/stores.spec.ts` 新增：名稱優先序（brand name → botName → 預設）、載入前為空字串、登出清空 `bots` 與 brand profile；至少一條「改壞會紅」實證（cp 快照還原）。
  - 真後端瀏覽器實測（puppeteer-core，:5173）：上述行為逐項確認，截圖存 scratchpad/botname/，結束無殘留 headless Chrome；不呼叫任何扣點端點。
- 範圍：只動 Impact 列的檔案；後端唯讀。

## Risks / Trade-offs

- `adopt()` 裡 `void` 掉的 promise 若在登出後才回來，會把上一個帳號的 `bots` 寫回來：用一個遞增序號擋掉過期回應（`discard()` 時序號 +1，回來時序號不符就丟棄）。
- brand store 的 `load()` 會在 `portraitConsent`／`imageLicense` 為空時補 i18n 預設文案，這是既有行為（合規頁本來就靠它），session store 只是提早觸發同一支 `load()`，不改語意。
