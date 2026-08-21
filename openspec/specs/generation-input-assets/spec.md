# generation-input-assets Specification

## Purpose

TBD - created by archiving change 'allow-edited-assets-as-generation-input'. Update Purpose after archive.

## Requirements

### Requirement: 編輯產物可作為生成輸入

source tag 為 `edit` 的素材 SHALL 可以在使用共用素材 picker 的生成流程中被選為輸入。

#### Scenario: 使用者選擇編輯產物來源

- **GIVEN** 素材庫中存在 tag 為 `edit` 的素材
- **WHEN** 使用者在 `ImagePickerDialog` 選擇「編輯產物」來源
- **THEN** 編輯產物會出現在可選取結果中

#### Scenario: 使用者在全部來源下選擇編輯產物

- **GIVEN** picker 的來源篩選為 `all`
- **WHEN** 已載入的素材集合中存在編輯產物
- **THEN** 編輯產物維持可見且可以被選取

#### Scenario: 將編輯產物回傳給生成頁面

- **WHEN** 使用者在共用 picker 中確認一個編輯產物
- **THEN** picker 透過與其他合法來源相同的 selected `Asset` contract 回傳素材
- **AND** 生成頁面不得只因其 tag 為 `edit` 就拒絕該素材
