## Problem

使用者實測回報：在圖片編輯器（`src/components/ImageEditorWorkspace.vue`）嘗試「背景移除」失敗後，切換到「加入物件」再切回「文字」工具，畫面仍然顯示著跟背景移除有關的紅字錯誤訊息「生成失敗，請再試一次」，使用者誤以為這個錯誤跟目前正在操作的「文字」工具有關。

## Root Cause

`aside.layers` 面板裡有一段 `p.editorError(v-if="toolError" role="alert") {{ toolError }}`，顯示範圍只看 `toolError` 是否有值，沒有限定在特定工具底下。但 `toolError` 全專案只有一個地方會被設成非空值——`selectRemoveTool`（背景移除工具）失敗時；它只在兩處被清空：`selectEditorAsset` 換素材時、`selectRemoveTool` 每次重新嘗試時，從來沒有在「使用者切換到別的工具」時被清空。這個錯誤字串語意上只屬於「背景移除」這個操作的結果，但畫面呈現位置卻是工具無關的共用區塊，導致殘留。

## Proposed Solution

- 在 `tool` 這個 ref 上新增一個 `watch`：當新值不是 `'remove'` 時把 `toolError.value` 清空
- `p.editorError` 的顯示條件從 `v-if="toolError"` 改成 `v-if="toolError && tool === 'remove'"`（雙重保險，即使 watch 因為非同步時序沒有即時清空，畫面也不會在錯的工具底下顯示這個字串）

## Non-Goals

- 不改變 `selectRemoveTool` 本身設定／判斷錯誤的邏輯
- 不改變 `errors.insufficientFeed`／`errors.generationFailed` 這兩個既有 i18n 字串的文案
- 不處理 `generateObjectFromDescription`（物件生成，目前是純前端 mock 模擬，不會真的失敗）未來若也需要錯誤提示的情境——那是獨立的功能需求，不在這次修正範圍
- 不改變裁切（`tool === 'crop'`）工具的行為——裁切工具本來就不顯示 `aside.layers`（`v-if="tool!=='crop'"`），不受這個錯誤訊息影響

## Success Criteria

- 背景移除失敗時，`tool === 'remove'` 底下正確顯示錯誤訊息（行為不變）
- 切換到「加入物件」或「文字」工具後，錯誤訊息 SHALL NOT 再顯示
- 切回「背景移除」工具後，錯誤訊息的既有行為（再次嘗試會先清空、失敗會再顯示）維持正確
- `npx vue-tsc --noEmit`、`npm run lint` 通過

## Impact

- Affected code:
  - Modified: src/components/ImageEditorWorkspace.vue
