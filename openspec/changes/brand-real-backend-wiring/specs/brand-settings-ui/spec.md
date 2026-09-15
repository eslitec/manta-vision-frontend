## MODIFIED Requirements

> 補記（2026-09-04）：本 delta 對應的內容已在 `feat/library-real-backend-wiring` 之後的
> 品牌設定串接工作中，直接套用進正式的 `openspec/specs/brand-settings-ui/spec.md`；本檔
> 是事後補上的 delta 紀錄，用來讓本 change 的 capability 宣告與 spec 檔對應得上。

### Requirement: 提供合規與授權資訊

品牌設定 SHALL 提供「合規與授權」區塊，記錄授權範圍、使用規範與肖像／素材授權相關資訊，且使用者填寫的內容 SHALL 被存檔、下次進入時原樣帶回。

#### Scenario: 使用者檢視合規與授權

- **WHEN** 使用者切到「合規與授權」
- **THEN** 顯示授權範圍、使用規範與相關授權紀錄的維護介面

#### Scenario: 使用者編輯肖像權同意條款或圖片授權聲明後存檔

- **WHEN** 使用者修改「肖像權同意條款模板」或「圖片授權／使用聲明」後按下儲存
- **THEN** 這兩個欄位的內容會隨其餘品牌設定一併存檔，重新載入頁面後維持使用者填寫的內容（而非每次都還原成預設文案）
