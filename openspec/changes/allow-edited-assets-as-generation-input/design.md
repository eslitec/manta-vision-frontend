## 背景

圖片編輯器會將輸出另存為 tag `edit`、顯示來源為「編輯產物」的新素材。共用 picker 目前已提供 `edit` 篩選，並且不依來源 tag 限制回傳的選取結果。

## 決策

編輯產物屬於可以重複利用的正式輸入素材。Picker SHALL 在未篩選的素材集合中保留編輯產物、提供 `edit` 來源篩選，並透過與上傳素材及 AI 生成素材相同的 `select` 或 `select-many` events 回傳結果。

生成頁面 SHALL 依素材型別及既有驗證規則判斷是否適用，不得只因素材的 source tag 是 `edit` 就拒絕使用。

## 驗證方式

- 確認 `ImagePickerDialog` 的來源選項包含 `{ value: 'edit' }`。
- 確認選擇 `edit` 時會顯示 `tag === 'edit'` 的素材，而且在 `all` 篩選下不會排除編輯產物。
- 確認所有生成頁面都透過現有 picker events 收到選取的 `Asset`。
