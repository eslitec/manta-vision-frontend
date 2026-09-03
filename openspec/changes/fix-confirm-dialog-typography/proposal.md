# Proposal：確認生成影片彈窗文字字級與顏色對齊設計稿

## 為什麼

使用者附上 Figma 連結（node `125:805`，「確認生成影片」對話框），要求把 `ConfirmGenerateDialog.vue` 的字體顏色、大小對齊設計稿。逐項核對後找到以下落差：

- 標題「確認生成影片」：實作 17px（`1.0625rem`）／`$blue-dark-300`（`#171e52`），設計稿是 18px Bold／`#383c4b`
- 內文說明：實作 14px／`$gray-400`（`#606472`）／line-height 1.6，設計稿是 16px Regular／`#606692`／line-height 22px（1.375）
- 「使用模型」「本次消耗」「剩餘飼料」三列：實作整列統一用同一個顏色（依 `--sub` 修飾詞決定整列深或淺），設計稿其實是「標籤」與「數值」各自獨立上色——`使用模型`／`剩餘飼料` 的標籤是淺灰 `#b4b9c4`、數值是 `#606692`；`本次消耗` 的標籤反而是較深的 `#383c4b`（跟其餘兩列不同）。原本的整列統一上色沒辦法呈現這個標籤／數值分色的設計
- 三列文字字級：實作是 15px（`--sub` 修飾詞底下是 13px），設計稿統一是 14px；「本次消耗」金額原本繼承列字級（15px）且沒有專屬字級設定，設計稿是 16px Bold `#ea903a`（`$orange`，色碼已對）

## 做了什麼

- `src/components/ConfirmGenerateDialog.vue`
  - 「使用模型」列（`.confirm__row` 內兩個 `span`）補上 `.confirm__label`／`.confirm__value` class，讓標籤與數值可以分別上色
  - `.confirm__title` 改 18px／`$dark-blue-gray`（`#383c4b`）
  - `.confirm__msg` 改 16px／`#606692`／line-height 1.375（22px）
  - `.confirm__row` 統一字級改 14px、line-height 1.4286（20px），移除原本 `--sub` 修飾詞的整列色碼／字級覆寫
  - 新增 `.confirm__label`（`$gray-100`，即 `#b4b9c4`）／`.confirm__value`（`#606692`）兩個共用文字色規則；`.confirm__row--card .confirm__label` 額外覆寫成 `$dark-blue-gray`，對齊「本次消耗」標籤比另外兩列深的設計
  - `.confirm__cost` 補上 16px 字級（原本沒有專屬字級，繼承列字級）；`.confirm__balance` 移除 `color/font-weight: inherit`，改成明確的 `#606692`／400，不再沿用「整列淺灰」的舊邏輯
- `openspec/specs/generate-video-ui/spec.md`：「送出生成前二次確認」Requirement 補上字級／顏色的明確數值與 Scenario、trace

## 影響範圍

只影響「確認生成影片」彈窗（`ConfirmGenerateDialog.vue`）本身的文字樣式；不影響彈窗的互動邏輯、送出生成流程，或其他頁面（該元件目前只有 `GenerateVideoView.vue` 使用）。
