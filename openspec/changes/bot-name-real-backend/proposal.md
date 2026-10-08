## Why

側欄品牌區、麵包屑第一段、圖片選擇器副標與圖庫提示都把「日安選物」寫死在 i18n 字串裡（`brand.name`、`imagePicker.subtitle`、`library.note`），接上真後端之後每個帳號看到的都是同一個假名字。後端已有 `GET /bots`（帳號可操作的機器人清單，`botName` 註冊預設「我的機器人」）與 `GET /brand`（品牌設定，`name` 可為空），前端照契約取名稱，畫面上的名字才是使用者自己的。

## What Changes

- session store 新增 `bots`（`GET /bots` 整份 `items`，供之後切換器用）與 `botName` 計算屬性：品牌設定 `name` → 當前 `botId` 那筆的 `botName` → i18n 預設「我的品牌」；兩支 API 都還沒回來前為空字串。登入／註冊成功與 app 啟動還原 session 時各打一次 `GET /bots` 與 `GET /brand`（後者沿用 brand store 的 `load()`），失敗不擋操作也不顯示錯誤；登出（含 forceLogout）清掉 `bots` 與 brand store 的 `profile`。
- 側欄品牌區與麵包屑第一段改讀 `session.botName`；圖片選擇器副標與圖庫提示改成帶 `{name}` 參數的字串並用同一份名稱。
- i18n：`brand.name` 改成中性的「我的品牌」／「My brand」（品牌設定輸入框 placeholder 沿用）；`imagePicker.subtitle`、`library.note` 改帶 `{name}`；兩份語系同步。
- mock 模式維持可用：`mockApi.listBots`／`getBrand` 已有值，不動。

## Non-Goals (optional)

- 不做機器人切換器（1:N 尚未上線）。
- 不動頂欄「擁有者」與麵包屑第二段「Manta Vision」。
- 不動 `src/views/UsageView.vue`、`src/components/ImageEditorWorkspace.vue`。
- 不改機器人名稱（後端沒有改名 API）。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `home-workbench-ui`: 側欄品牌區與麵包屑第一段顯示目前機器人的實際名稱（品牌設定名稱優先、退回機器人名稱、再退回預設字串），名稱在登入與啟動時各取一次、登出清空。
- `library-management-ui`: 圖庫提示與圖片選擇器副標帶入同一份機器人名稱，不再寫死。

## Impact

- Affected specs: `home-workbench-ui`、`library-management-ui`
- Affected code:
  - Modified:
    - src/stores/session.ts
    - src/stores/brand.ts
    - src/stores/stores.spec.ts
    - src/layouts/DefaultLayout.vue
    - src/components/ImagePickerDialog.vue
    - src/views/LibraryView.vue
    - src/lang/zh-Hant.ts
    - src/lang/en.ts
