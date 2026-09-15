## 1. 產品決策

- [x] 1.1 交付 **編輯產物可作為生成輸入**，記錄 `edit／編輯產物` 屬於後續生成流程的合法輸入素材。

## 2. 既有實作確認

- [x] 2.1 確認 `ImagePickerDialog` 提供 `edit` 來源，並在 `edit` 與 `all` 篩選下包含編輯產物。
- [x] 2.2 確認 picker 透過既有 `select` 與 `select-many` contracts 回傳編輯產物。
- [x] 2.3 確認生成頁面不會依 source tag 排除已選取的編輯產物。

## 3. 驗證

- [x] 3.1 執行 Spectra strict validation、ESLint、Vitest 與 production build。
