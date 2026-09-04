## Why

素材庫已將非破壞性編輯輸出儲存為 source tag `edit` 的新素材，但這些素材能否作為後續生成流程的輸入，原本缺少明確的產品決策。

## What Changes

- 確認 tag 為 `edit` 的資產屬於合法生成輸入。
- 在共用 `ImagePickerDialog` 中保留「編輯產物」來源篩選。
- 使用共用 picker 的生成頁面可以選取編輯產物，不因來源 tag 而排除。

## Capabilities

### New Capabilities

- `generation-input-assets`：從素材庫選擇生成輸入時的資格規則。

### Modified Capabilities

無。

## Impact

- 影響 `ImagePickerDialog` 的來源選項與篩選行為。
- 影響使用共用 picker 的圖片、行銷貼文、影片與 AI 試穿生成流程。
- 既有非破壞性編輯輸出與素材持久化行為維持不變。
