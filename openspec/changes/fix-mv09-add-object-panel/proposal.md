# Proposal：加入物件面板對齊設計稿（1141:906／1141:941）

## 為什麼

使用者要求核對「加入物件」畫面（Figma `1141:906` 整頁、`1141:941` 側邊欄面板）跟目前實作的落差。逐項核對後找到以下差異：

- 描述框字數上限：畫面顯示「/ 120」、`textarea` 也設了 `maxlength="120"`，但 Figma `char_counter`（1142:798）顯示「0 / 200」——字數上限少了 80 字
- 描述框 placeholder：實作是「描述想加入的物件，例如「一束向日葵」」，跟 Figma `field_物件描述`（1142:796）的「描述要生成的物件，例：一束粉色乾燥花，放在桌面左側…」文案不同
- 提示文字漏字：實作「生成後成為獨立圖層，可再調整」，Figma `row_obj_act`（1142:812）是「生成後成為獨立圖層，可再調整位置」，少了「位置」二字
- 提示文字顏色：實作用 `#9299aa`，Figma 是 `#b4b9c4`
- 面板內間距：`.objectGenerator` 六個子項目間距實作用 8px，Figma（1141:952）統一是 10px
- 預設 chip 樣式：實作圓角 14px、文字色 `#606692`、字級 13px，Figma（1142:800／1140:768，「加入物件」跟「修圖常用指令」共用同一組 chip 規格）是圓角 18px、文字色 `#383c4b`、字級 14px；且「加入物件」的 chip 間距是 6px（實作跟「常用指令」共用 8px 的間距）
- 畫布上的框選範圍（`.objectSelection`）：Figma（1141:1140 selection_marquee）有淡藍底色 `rgba(46,53,103,0.1)`、圓角 6px，實作完全沒有底色、圓角是 4px
- 框選範圍下方提示氣泡（`.objectSelection__tip`）：Figma（1141:1145）圓角 6px、上下內距 6px、文字 11px Medium，實作是藥丸形 12px 圓角、上下內距 4px、文字 12px 沒有加粗
- `en.ts` 完全缺少 `addObject` 與 `cropApplied` 兩組翻譯（`zh-Hant.ts` 都有），英文語系目前這兩塊會顯示原始 key 或 fallback

## 做了什麼

- `src/components/ImageEditorWorkspace.vue`
  - `textarea.objectGenerator__desc` 的 `maxlength` 與字數顯示改成 200
  - `.objectGenerator` 子項目間距改成 0.625rem（10px）
  - `.presetChip`（「加入物件」與「修圖常用指令」共用）圓角改 18px、文字色改 `#383c4b`、字級改 0.875rem（14px）
  - 新增 `.objectGenerator .presetRow` 覆寫：間距 0.375rem（6px）、移除重複 margin（父層 flex gap 已經處理間距）
  - `.objectGenerator__hint` 顏色改 `#b4b9c4`
  - `.objectSelection` 補上底色 `rgba(46,53,103,0.1)`、圓角改 6px
  - `.objectSelection__tip` 圓角改 6px、上下內距改 0.375rem（6px）、字級改 0.6875rem（11px）並加粗
- `src/lang/zh-Hant.ts`：修正 `descriptionPlaceholder`、`hint` 文案對齊設計稿
- `src/lang/en.ts`：補上缺漏的 `addObject`、`cropApplied` 翻譯區塊（含 `tools.removeInProgress*`）
- `openspec/specs/image-editor-ui/spec.md`：「加入物件為文字描述生成，非從圖庫疊圖」Requirement 補上樣式細節與 Scenario、trace

## 影響範圍

只影響「加入物件」面板本身與畫布上的框選 UI；`.presetChip`／`.presetRow` 是跟「修圖常用指令」共用的樣式，圓角／文字色／字級的修正兩邊都會套用（兩邊都對過各自的 Figma 節點，數值一致），但間距覆寫只作用在「加入物件」，不影響修圖面板。
