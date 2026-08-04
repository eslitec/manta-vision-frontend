## Context

`vue-i18n` 目前透過 `src/lang/index.ts` 建立 `i18n` 實例，在 `src/main.ts` 用 `app.use(i18n)` 全域註冊，並開了 `globalInjection: true`，讓任何樣板都能直接用 `$t('key')` 不用個別 import。實際盤點下來，全專案只有 3 個檔案用到這個機制：`HomeView.vue`、`DefaultLayout.vue`、`FeedBadge.vue`；其餘 7 個畫面本來就沒有用到，是寫死的中文字串。動機詳見 `proposal.md` 的 Why。

## Goals / Non-Goals

**Goals:**
- 移除 `vue-i18n` 這一層抽象，3 個受影響檔案的文字改成直接寫死在樣板裡，畫面呈現的中文內容完全不變。
- 完整移除相關的初始化程式碼、語言檔資料夾與 npm 依賴，不留下用不到的殘留程式碼。

**Non-Goals:**
- 重新設計這 3 個檔案的其他部分（樣板結構、樣式、邏輯）——只動文字相關的部分。
- 決定要不要移除語言切換器——這個決策已經在 `sync-mv-00-design` 做過了，這裡只是執行面上一併清掉相關程式碼。

## Decisions

- **文字直接寫死在樣板裡，不引入任何替代的「文字集中管理」機制**（例如把字串搬到一個純 TS 常數檔）。理由：專案已經有 7 個畫面示範了「文字直接寫在樣板裡」這個模式，維持一致的寫法，不要為 3 個檔案另外發明一套新規則。考慮過的替代方案：把字串搬到一個 `constants.ts` 集中放——已否決，這其實是換一種方式重建「查字典」的抽象，違背這次移除 i18n 的初衷。
- **`FeedBadge.vue` 兩個字串（`feedBadge.unit` = 「顆」、`feedBadge.topup` = 「儲值」）直接內聯進樣板**，因為只有這一個元件用到，沒有共用的必要。
- **拆除順序：先改 3 個檔案的樣板文字，確認畫面正常，再移除 `main.ts` 的註冊、`src/lang/` 資料夾、`package.json` 依賴。** 理由：如果反過來先刪 `src/lang/`，中間會有一段時間 `HomeView.vue` 等檔案的 `$t()` 呼叫會直接壞掉（`import` 失敗、`build` 報錯），沒辦法逐步驗證；照這個順序做，每一步都能跑 `npm run build` 確認沒壞。
- **`FeedBadge.vue` 目前透過 `globalInjection: true` 使用 `$t`，沒有自己 `import { useI18n }`**，所以拿掉 i18n 後這個檔案不需要移除 import（本來就沒有）。

## Risks / Trade-offs

- [如果之後這個 App 真的要做多語言，要重新導入 i18n] → 可以接受：YAGNI 的取捨就是這樣，真的有需求時再加回來，屆時 `en.ts` 的內容已經在 git 歷史裡，不是從零開始。
- [`FeedBadge.vue` 是共用元件，如果之後有其他地方也想用它，硬字串比較不好共用] → 目前只有一處使用；等真的出現第二個使用情境，再視情況決定要不要抽成 props 傳入文字。
