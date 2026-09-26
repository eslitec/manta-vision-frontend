# Proposal：圖生圖「生成張數」改成 1／2／3／4 四顆

## 為什麼

使用者要求「生成張數不要 2、4，可以 1、2、3、4」。目前 `GenerateImageView.vue` 的張數 pill 寫死 `[2, 4]`，只能挑 2 張或 4 張；後端 `POST /generate` 的 `count` 已同步放寬為 1～4（`regenOf` 仍固定 1 張）。

## 做了什麼

- `src/views/GenerateImageView.vue`：`counts` 從 `[2, 4]` 改為 `[1, 2, 3, 4]`。pill 文案本來就走 `image.imageCount`（`{count} 張`／`{count} images`），預估消耗本來就是「單價 × 張數」，`buildReq` 直接送 `count`，都不必改
- `src/types/api.ts`：`GenerateImageReq.count` 註解由「只能 2 或 4」改為「1～4」
- `openspec/changes/generate-count-options/specs/generate-image-ui/spec.md`：新增 Requirement「生成張數選項」

## 影響範圍

只影響圖生圖頁的張數選項；mock `generateImages` 依 `count` 回傳對應張數（既有 `count: 3` 測試已涵蓋），i18n 不新增 key，任務中心不記錄張數。「重新生成」仍固定 1 張，不受影響。
