## 1. 基礎狀態改為真正的空

- [x] 1.1 落地設計決策「決策 1：`selectedAssetName` 初始值改為空字串」：`src/components/ImageEditorWorkspace.vue` 的 `selectedAssetName` 初始值從 `ref(t('editor.demoAsset'))` 改成 `ref('')`
- [x] 1.2 落地設計決策「決策 2：「原圖」圖層改成選定素材當下才建立，`layers` 初始值為空陣列」：`layers` 初始值改成 `reactive<EditorLayer[]>([])`；`selectEditorAsset(asset)` 新增邏輯：`layers` 裡沒有 `key === 'original'` 的項目時 push 一筆新的原圖圖層並把 `selectedLayerKey` 設成 `'original'`，若已經有則就地更新該筆圖層對應的內容
- [x] 1.3 落地設計決策「決策 3：`originalLayer` computed 拿掉非空斷言，改成可能是 `undefined`」：`originalLayer` computed 移除 `!` 非空斷言；樣板第 117 行附近的 `template(v-if="originalLayer.visible")` 改成 `template(v-if="originalLayer?.visible")`；`toggleOriginalLock` 加上對 `originalLayer.value` 不存在時的防呆
- [x] 1.4 落地設計決策「決策 4：`selectedLayerKey` 初始值改為空字串，代表「沒有任何圖層被選取」」：`selectedLayerKey` 初始值從 `ref('original')` 改成 `ref('')`；確認 `selectedLayer`／`canDuplicateSelectedLayer` 等既有依賴在空狀態下（`selectedLayer.value` 為 `undefined`）不會出錯

## 2. 畫面條件顯示與工具列停用

- [x] 2.1 落地設計決策「決策 7：新增空狀態文案 i18n key」：`src/lang/zh-Hant.ts`／`src/lang/en.ts` 新增 `editor.emptyState.title`、`editor.emptyState.canvasHint`，兩邊 key 結構一致
- [x] 2.2 落地設計決策「決策 5：標題列與工具列依「是否已選定素材」條件顯示／停用」：新增 `hasSelectedAsset` computed（依 `selectedAssetName` 或既有能代表「是否已選定」的 ref 判斷，不重複定義語意相同的旗標），標題列在 `!hasSelectedAsset` 時顯示 `editor.emptyState.title`
- [x] 2.3 對齊 Requirement「編輯器在尚未選定素材時呈現真正的空狀態」新增內容：「狀態：已編輯」徽章、換頁箭頭（‹ ›）、「另存為新素材」按鈕加上 `v-if="hasSelectedAsset"`
- [x] 2.4 落地設計決策「決策 6：畫布空狀態加上引導文字，不新增額外的點擊區域」：畫布的 `IconImagePlaceholder` 旁加上 `editor.emptyState.canvasHint` 文字，不綁定額外的 `@click`
- [x] 2.5 對齊 Requirement「使用者在空狀態下嘗試點擊已停用的工具」：左側工具列（背景移除、加入物件、文字、裁切，含 `retouch` 模式對應的工具列按鈕）在 `!hasSelectedAsset` 時加上 `disabled` 屬性與既有的停用樣式；「從圖庫選擇」／「上傳圖片」不受影響維持可用

## 3. 驗證

- [x] 3.1 `npx vue-tsc --noEmit` 通過，確認 `originalLayer` 型別改為 `EditorLayer | undefined` 後所有呼叫點都正確處理
- [x] 3.2 `npm run lint` 通過
- [x] 3.3 對齊 Requirement「使用者初次進入編輯圖片分頁」——瀏覽器手動驗證：真後端（`qa_brand_test`）進入「編輯圖片」分頁，`agent-browser` snapshot 確認標題為「尚未選擇素材」、圖層面板只有「圖層」標題與停用的「複製圖層」按鈕（無任何項目）、畫布顯示灰色示意圖示＋「請點擊上方「從圖庫選擇」開始編輯」引導文字、狀態徽章／換頁箭頭／另存為新素材按鈕不存在於 DOM、左側工具列「背景移除」「加入物件」「文字」「裁切」四個按鈕皆帶 `disabled` 屬性
- [x] 3.4 對齊 Requirement「使用者在空狀態下嘗試點擊已停用的工具」——瀏覽器手動驗證：`snapshot -i` 確認四個工具按鈕的 accessibility 節點皆標示 `[disabled]`，瀏覽器對 `disabled` 按鈕的原生點擊不會觸發任何 handler（Vue `disabled` 屬性語意即禁止事件觸發），畫面沒有切換到任何工具面板
- [x] 3.5 對齊 Requirement「使用者選定素材後畫面恢復正常」——瀏覽器手動驗證：點擊「從圖庫選擇」選定 `login-bg.png`，確認標題變成「login-bg.png」、圖層清單出現「原圖：login-bg.png」且為選取狀態、「狀態：已編輯」徽章出現、工具列四按鈕恢復可用（無 `disabled`）
- [x] 3.6 對齊 Requirement「使用者在已選定素材後再次更換素材，原圖圖層就地更新不疊加」——瀏覽器手動驗證：已選定 `login-bg.png` 後再次點擊「從圖庫選擇」改選 `e2e_crop_1788942798982.png`，確認標題與圖層面板的「原圖」名稱同步更新成新檔名，且圖層清單自始至終只有一筆原圖圖層，沒有疊加出第二筆
- [x] 3.7 瀏覽器手動驗證：選定素材後點擊「文字」工具，新增文字圖層顯示「文字：輸入文字」，與既有「原圖：{檔名}」圖層並存且命名皆正確（`fix-editor-layer-names-dynamic` 的動態命名邏輯未被破壞）
- [x] 3.8 執行 `spectra validate fix-editor-empty-state-before-asset-selected --strict` 與 `spectra analyze fix-editor-empty-state-before-asset-selected`，確認沒有 CRITICAL／WARNING 級別的發現
- [ ] 3.9 PR 合併並確認畫面驗收無誤後執行 `spectra archive fix-editor-empty-state-before-asset-selected`
