## 1. 實作

- [x] 1.1 對齊 Requirement「生成張數選項」：`GenerateImageView.vue` 的 `counts` 改為 `[1, 2, 3, 4]`，預估消耗沿用「單價 × 張數」
- [x] 1.2 `src/types/api.ts` 的 `GenerateImageReq.count` 註解改為 1～4
- [x] 1.3 `npx vitest run`、`npx vue-tsc --noEmit`、`npx eslint .`、`npx prettier --check` 改動檔全過
- [x] 1.4 mock 冒煙（:5174 ＋ puppeteer）：四顆 pill、選 1 張預估 8、選 3 張預估 24、生成 3 張出 3 張結果卡

## 2. 歸檔

- [ ] 2.1 PR 合併並確認不再修改後執行 `spectra archive generate-count-options`
