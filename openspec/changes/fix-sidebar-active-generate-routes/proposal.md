# Proposal：側邊欄「AI 生成工作台」在生成工具子頁面保持選取狀態

## 為什麼

PR review 上 @nelsonliu-eslitec 對 `src/layouts/DefaultLayout.vue` 留言：「從 AI 生成工作台 進入的頁面，例如圖生圖，sider 這邊的 AI 生成工作台 應該要保持選取的狀態」。

追查 `DefaultLayout.vue` 的 `isActive` 邏輯：

```js
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
```

「AI 生成工作台」導覽項目的 `to` 是 `'/'`，比對邏輯是嚴格相等（`route.path === '/'`）。但 `router/routes.ts` 裡圖生圖／AI 產文／圖生影片／AI 試穿都掛在獨立的 `/generate/*` 子路由下（例如圖生圖是 `/generate/image`），不是 `/` 底下的巢狀路由。使用者從工作台點進任一生成工具頁面後，`route.path` 變成 `/generate/xxx`，不再等於 `/`，導致「AI 生成工作台」項目失去選取狀態，側邊欄變成沒有任何項目顯示使用中樣式。

## 做了什麼

- `src/layouts/DefaultLayout.vue`
  - `navItems` 每一項改用 `NavItem` 型別（`label`／`icon`／`to`／可選的 `activePrefixes`），「AI 生成工作台」項目補上 `activePrefixes: ['/', '/generate']`
  - `isActive(to)` 改成 `isActive(item)`：依 `item.activePrefixes`（沒設定則退回 `[item.to]`）逐一比對，`/` 仍用嚴格相等、其餘用 `startsWith`，只要任一 prefix 命中就視為選取中
  - 這個寫法可延伸給未來其他「主項目底下有獨立子路由」的巢狀導覽情境使用，不用再各別特判
- `openspec/specs/home-workbench-ui/spec.md`：「側邊欄標示目前所在區塊」Requirement 補上「使用者從工作台進入生成工具頁面」Scenario 與 trace

## 影響範圍

只影響側邊欄導覽項目的選取狀態判斷邏輯，不影響實際路由、頁面內容或其他導覽項目（圖庫／飼料用量／設定目前都還是單一路徑，行為不變）。
