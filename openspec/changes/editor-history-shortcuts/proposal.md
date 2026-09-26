## Why

使用者原話：「在圖庫管理中心編輯圖片的時候要可以 command Z、command C、command V 等等動作，然後也要可以提示使用者有這些輔助，並且可以上一步、下一步。」

目前編輯器完全沒有上一步／下一步、沒有任何 ⌘／Ctrl 快捷鍵，也沒有刪除圖層的入口；工具列上 Figma 稿畫成上一步／下一步的 ‹ ›（`ic_back`／`ic_next`，node `566:4983`／`566:4986`）被 `3456671` 誤接成縮放。拖錯、刪錯、打錯字都只能手動改回去。

## What Changes

- 新增上一步／下一步：可編輯文件（圖層含順序、顯示、內容、位置、縮放、字型、顏色，加上裁切框與比例）以 JSON 快照記錄，一個 watch 當唯一記錄點；拖曳／縮放／裁切框拖曳一次一步，文字編輯一次一步，連續輸入／色盤／方向鍵 1 秒內合併；最多 50 步；換底圖清空歷史；另存不清歷史；扣款紀錄不受影響。純邏輯抽成 `src/composables/useEditorHistory.ts` 並補 vitest。
- 新增鍵盤快捷鍵：⌘／Ctrl＋Z 上一步、⇧⌘Z／⌘Y 下一步、⌘C／⌘X／⌘V 圖層複製剪下貼上（元件內部剪貼簿，貼上錯開 3%）、⌘D 原地複製、Delete／Backspace 刪除圖層、方向鍵微調（Shift 10%）。焦點在文字輸入、對話框開著、注音選字、AI 修圖頁時交給瀏覽器原生行為或不作用。
- 工具列 ‹ › 改回上一步／下一步（依可否操作停用），縮放改成「− 80% +」；圖層面板標題列加垃圾桶按鈕。
- 提示：按鈕 `title`／`aria-label` 含平台快捷鍵（Mac 顯示 ⌘、其他 Ctrl）；畫布底部常駐「鍵盤快捷鍵」入口可開一覽；⌘C／⌘X 後顯示 2 秒貼上提示。i18n 兩語系同步。
- 行為修正：編輯畫布文字時按到畫布上其他物件，先結束文字編輯並記成獨立一步（原本停在編輯狀態、之後的 Delete／⌘Z 會打到那個文字框）；畫布文字編輯改 `contenteditable="plaintext-only"`，⌘V 貼上富文字只留純文字。

## Non-Goals (optional)

- 系統剪貼簿（跨分頁／跨 App 複製貼上、從外部貼圖片成為物件圖層）。
- 多選、框選、⌘A 全選、群組、對齊；Esc 取消選取；`?` 開一覽；自訂快捷鍵；首次進入的一次性提示。
- 歷史跨分頁／重新整理保存（切回素材庫即清空）；AI 修圖頁的歷史與快捷鍵。
- 物件微調與拖曳的邊界夾限一致化。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `image-editor-ui`：新增上一步／下一步、鍵盤快捷鍵、圖層複製剪下貼上與刪除、快捷鍵提示四個 Requirement。

## Impact

- Affected specs: `image-editor-ui`（ADDED 四個 Requirement）
- Affected code:
  - New: src/composables/useEditorHistory.ts、src/composables/useEditorHistory.spec.ts
  - Modified: src/components/ImageEditorWorkspace.vue（工具列、圖層面板標題列、畫布底部提示、歷史接線、快捷鍵處理器、圖層操作）
  - Modified: src/lang/zh-Hant.ts、src/lang/en.ts
