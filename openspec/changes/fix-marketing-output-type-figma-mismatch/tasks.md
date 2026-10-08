## 1. 底盤與選項卡片結構

- [x] 1.1 對齊 Requirement「要產出什麼分段選擇器視覺呈現對齊設計稿」：`src/views/MarketingPostView.vue` 的 `.outputTypes` 改成共用底盤——`background: $blue-light`（`#eff2fa`）、`padding: 0.25rem`（4px）、`gap: 0.25rem`（4px）、`border-radius: 10px`；移除 `flex-wrap`
- [x] 1.2 對齊 Requirement「要產出什麼分段選擇器視覺呈現對齊設計稿」：`.outputTypeCard` 改成 `flex: 1 0 0`、`padding: 0.4375rem 0.625rem`（7px 10px）、`border-radius: 8px`，移除既有的 `border: 1px solid #d2d5dd`、`background: $white`、`min-width: 6.5rem`（未選取狀態改為透明背景無邊框）
- [x] 1.3 對齊 Requirement「要產出什麼分段選擇器視覺呈現對齊設計稿」：`.outputTypeCard.isActive` 改成 `background: $white`、`box-shadow: 0px 1px 1.5px rgba(0, 0, 0, 0.1)`，移除既有的 `1.5px solid $blue-dark-500` 邊框

## 2. 文字與圖示樣式

- [x] 2.1 對齊 Requirement「未選取狀態的選項文字與飼料顆數樣式」：`.outputTypeCard__label` 改成 `font-size: 0.75rem`（12px）、`font-weight: 400`、`color: #606692`（移除既有的 `font-weight: 700`、`font-size: 0.875rem`）
- [x] 2.2 對齊 Requirement「未選取狀態的選項文字與飼料顆數樣式」：`.outputTypeCard__cost` 改成 `font-size: 0.625rem`（10px）、`color: $gray-100`（`#b4b9c4`）；`.outputTypeCard__icon` 改成 `width/height: 0.6875rem`（11px）
- [x] 2.3 對齊 Requirement「選取狀態的選項文字與飼料顆數樣式」：`.isActive .outputTypeCard__label` 改成 `font-weight: 500`、`color: $blue-dark-500`（字級維持 12px 不變）；`.isActive .outputTypeCard__cost` 改成 `color: $orange`（`#ea903a`，取代既有的 `$blue-dark-500`）

## 3. 驗證

- [x] 3.1 `npx vue-tsc --noEmit` 通過
- [x] 3.2 `npm run lint` 通過
- [x] 3.3 對齊 Requirement「未選取狀態的選項文字與飼料顆數樣式」與「選取狀態的選項文字與飼料顆數樣式」——`agent-browser` 截圖比對 Figma node `1440:586`：預設狀態（「文案＋配圖」選取）截圖與 Figma 截圖視覺一致（共用灰底盤、選取卡片白底陰影、未選取透明背景）；切換到「只要文案」後截圖確認該卡片變白底陰影、標籤變深藍、「2 顆飼料」文字變橘色 `#ea903a`，其餘兩個選項的顆數文字維持淺灰；未另外實測切到「只要配圖」，因為樣式邏輯（`.isActive` class 綁定）與「只要文案」共用同一份，程式碼審閱確認一致
- [x] 3.4 執行 `spectra validate fix-marketing-output-type-figma-mismatch --strict` 與 `spectra analyze fix-marketing-output-type-figma-mismatch`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 3.5 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-marketing-output-type-figma-mismatch`
