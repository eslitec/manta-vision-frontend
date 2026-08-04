## Why

這個 App 已經確認只會有單一語系（繁體中文），不會做多語言。目前用 `vue-i18n` 讓所有畫面文字透過 `$t('key')` 查詢 `src/lang/zh-Hant.ts`／`en.ts`，這一層「查字典」的抽象在不需要多語言的情況下是不必要的複雜度（YAGNI）。拿掉之後，文字直接寫死在樣板裡，改文案不用在兩個檔案（樣板＋語言檔）之間對照，新手也更容易看懂程式碼在做什麼。

## What Changes

- 盤點結果：實際用到 `$t()` 的只有 3 個檔案——`src/views/HomeView.vue`、`src/layouts/DefaultLayout.vue`、`src/components/FeedBadge.vue`。其餘 7 個畫面（`LibraryView.vue` 等）原本就是寫死中文，不受影響。
- 把這 3 個檔案裡的 `{{ $t('xxx') }}` 全部換成 `zh-Hant.ts` 裡對應的實際中文字串。
- 移除 `DefaultLayout.vue` 的語言切換器 `<select>` 與相關的 `locale`／`SUPPORTED_LOCALES` 程式碼——這個移除的「決策」已經在 `sync-mv-00-design` change 記錄過（任務 4.1），這裡只是因為要拆 i18n 而順便一起清掉，不重複記錄決策本身。
- 移除 `src/main.ts` 裡 `vue-i18n` 的初始化（`app.use(i18n)`）。
- 移除 `src/lang/` 整個資料夾（`zh-Hant.ts`、`en.ts`、`index.ts`）。
- 移除 `package.json` 裡的 `vue-i18n` 依賴。

## Capabilities

（無——`skip_specs: true`，這是純技術重構：畫面上呈現的文字內容完全不變，只是實作方式從「透過 i18n 查詢」改成「直接寫在樣板裡」，不涉及可觀察行為的變化）

## Impact

- `src/views/HomeView.vue`
- `src/layouts/DefaultLayout.vue`
- `src/components/FeedBadge.vue`
- `src/main.ts`
- `src/lang/`（整個資料夾移除）
- `package.json`（移除 `vue-i18n` 依賴）
