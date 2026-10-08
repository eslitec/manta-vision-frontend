## Why

MantaGO（MV-00~05）的 Figma 設計稿在頁面剛實作完之後又更新過了。首頁 `HomeView.vue`（MV-00）跟共用的版面 `DefaultLayout.vue` 已經跟最新設計稿對不上：文案改了、部分視覺處理（使用中狀態的強調色條、完成狀態圖示）過時了，還有幾個設計稿上有、但程式碼裡完全沒有的元素（頂部「任務」按鈕、側邊欄底部連結、統一風格的卡片圖示）。這個 change 先補齊 MV-00 這部分，MV-01~05 之後各自開獨立的 change 處理。

## What Changes

- 更新 `src/lang/zh-Hant.ts` 裡的文案，對齊設計稿：首頁副標題、卡片標題「圖生影」→「圖生影片」、頂部工具列角色文字、圖庫橫幅說明文字。
- 在 `DefaultLayout.vue` 幫使用中的側邊欄項目加上左側強調色條。
- 把「品牌設定已完成」狀態前面寫死的 `✓` 文字符號，換成獨立的圖示元素。
- 在側邊欄導覽列下方補上「教學文件」「登出」兩個連結（先做成灰階/未啟用樣式，符合設計稿的呈現）。
- 在頂部工具列新增「任務」按鈕。
- 把首頁 4 張功能卡片的圖示，從目前各卡不同顏色底的 emoji，改成統一風格的圖示方塊。
- **直接移除頂部工具列的語言切換器**（`en`/`zh-Hant` 的 `<select>`）——已確認設計稿上沒有這個元件，且這個 App 要拿掉語言切換功能（`en.ts`／`zh-Hant.ts` 語言檔本身不受影響，只移除畫面上的切換控制項）。
- 在 4 張生成工具卡片右上角都加上「消耗飼料」徽章圖示——已確認語意，且設計稿只畫了 2 張卡片是遺漏（design 疏漏），4 張卡片行為一致，都要顯示。

## Capabilities

### New Capabilities
- `home-workbench-ui`：首頁／工作台頁面（MV-00）與共用的 App 外殼（側邊欄、頂部工具列）——使用者進入 AI 生成工作台時，看到哪些數據、導覽項目與可操作動作。

### Modified Capabilities
（無——這是第一個碰到這個 capability 的 change）

## Impact

- `src/views/HomeView.vue`
- `src/layouts/DefaultLayout.vue`
- `src/lang/zh-Hant.ts`
- 預期不涉及 API、store 或路由變動；純畫面呈現層的修改。
