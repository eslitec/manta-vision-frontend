## ADDED Requirements

### Requirement: Icon 元件 SHALL 透過具名 barrel 匯出

`src/components/icons/index.ts` SHALL 對 `src/components/icons/` 底下每一個 icon 元件提供一行具名 re-export，讓外部程式碼可以用單一模組路徑具名匯入任意數量的 icon。

#### Scenario: 匯出既有 icon 元件

- **WHEN** `src/components/icons/` 底下存在一個 icon 元件檔案
- **THEN** `src/components/icons/index.ts` SHALL 包含一行對應該元件的具名 re-export

##### Example: 匯出 IconAddObject

- **GIVEN** `src/components/icons/IconAddObject.vue` 存在且以 `export default` 匯出元件
- **WHEN** 讀取 `src/components/icons/index.ts`
- **THEN** 檔案內 SHALL 包含 `export { default as IconAddObject } from './IconAddObject.vue'`

### Requirement: 消費端程式碼 SHALL 從 barrel 具名匯入 icon

`src/components/icons/` 以外的程式碼在使用 icon 元件時，SHALL 從 `@/components/icons` 具名匯入，SHALL NOT 直接匯入個別 icon 元件的 `.vue` 檔案路徑。

#### Scenario: 單一檔案使用多個 icon

- **WHEN** 一個消費端檔案需要用到多個 icon 元件
- **THEN** 該檔案 SHALL 用單一具名 import 陳述式從 `@/components/icons` 一次匯入所有用到的 icon，SHALL NOT 為每個 icon 各寫一行指向個別 `.vue` 檔案的 import

##### Example: LibraryView 匯入兩個 icon

- **GIVEN** `LibraryView.vue` 用到 `IconUpload` 與 `IconChevronDown`
- **WHEN** 撰寫該檔案的 import 陳述式
- **THEN** SHALL 寫成 `import { IconUpload, IconChevronDown } from '@/components/icons'`，SHALL NOT 分別寫成 `import IconUpload from '@/components/icons/IconUpload.vue'` 與 `import IconChevronDown from '@/components/icons/IconChevronDown.vue'`
